// Edge Function: delete_old_profiles
// GDPR: pending gdpr_requests due → erase legacy questionnaires (+ submissions),
// sessions, OTP; remove Storage attachments when SUBMISSION_FILES_BUCKET is set.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function removeSubmissionAttachments(
  supabase: ReturnType<typeof createClient>,
  bucket: string | undefined,
  answers: unknown
): Promise<void> {
  if (!bucket || !answers || typeof answers !== "object") return;
  const att = (answers as Record<string, unknown>).attachments;
  if (!Array.isArray(att)) return;
  const paths: string[] = [];
  for (const a of att) {
    if (typeof a === "object" && a && "storage_path" in a) {
      paths.push(String((a as { storage_path: string }).storage_path));
    }
  }
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) {
    console.warn("Storage remove warning:", error.message);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const submissionBucket = Deno.env.get("SUBMISSION_FILES_BUCKET")?.trim() ||
      undefined;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({
          error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("Starting GDPR deletion process...");

    const { data: gdprRequests, error: fetchError } = await supabase
      .from("gdpr_requests")
      .select("id, profile_id, status, scheduled_delete_at")
      .eq("status", "pending")
      .lte("scheduled_delete_at", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching GDPR requests:", fetchError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch GDPR requests",
          details: fetchError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!gdprRequests || gdprRequests.length === 0) {
      console.log("No GDPR requests pending deletion");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No pending GDPR requests found",
          processed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Found ${gdprRequests.length} GDPR requests to process`);

    let successCount = 0;
    let failCount = 0;
    let deferredCount = 0;
    const errors: string[] = [];

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const request of gdprRequests) {
      try {
        const profileId = request.profile_id;
        console.log(`Processing GDPR request ${request.id} profile_id=${profileId}`);

        const { error: deleteError } = await supabase
          .from("questionnaires")
          .delete()
          .eq("contact_identifier", profileId)
          .lt("submitted_at", oneWeekAgo);

        if (deleteError) {
          if (
            deleteError.code === "PGRST116" ||
            deleteError.message?.includes("not found")
          ) {
            console.log(
              `No questionnaires deleted for profile_id: ${profileId} (already gone or none matched age rule)`,
            );
          } else {
            throw deleteError;
          }
        }

        const { data: remainingQuestionnaires } = await supabase
          .from("questionnaires")
          .select("id")
          .eq("contact_identifier", profileId)
          .limit(1);

        if (remainingQuestionnaires && remainingQuestionnaires.length > 0) {
          console.log(
            `Defer GDPR ${request.id}: legacy questionnaires still exist (cool-off / age rule).`,
          );
          deferredCount++;
          continue;
        }

        const { data: idsRaw, error: rpcError } = await supabase.rpc(
          "submission_ids_for_gdpr_profile",
          { p_profile_id: profileId },
        );

        if (rpcError) {
          throw new Error(
            `submission_ids_for_gdpr_profile RPC failed (apply migration 20260501120000_gdpr_submissions_match.sql): ${rpcError.message}`,
          );
        }

        const submissionIds = Array.isArray(idsRaw)
          ? (idsRaw as string[])
          : [];

        for (const sid of submissionIds) {
          const { data: row } = await supabase
            .from("submissions")
            .select("answers")
            .eq("id", sid)
            .maybeSingle();

          await removeSubmissionAttachments(
            supabase,
            submissionBucket,
            row?.answers,
          );

          const { error: delSubErr } = await supabase
            .from("submissions")
            .delete()
            .eq("id", sid);

          if (delSubErr) {
            throw new Error(
              `Failed to delete submission ${sid}: ${delSubErr.message}`,
            );
          }
        }

        const { error: sessionDeleteError } = await supabase
          .from("sessions")
          .delete()
          .eq("contact_identifier", profileId);

        if (sessionDeleteError && sessionDeleteError.code !== "PGRST116") {
          console.warn(
            `Warning: Could not delete sessions for profile_id: ${profileId}`,
            sessionDeleteError,
          );
        }

        const { error: otpDeleteError } = await supabase
          .from("otp_codes")
          .delete()
          .eq("contact_identifier", profileId);

        if (otpDeleteError && otpDeleteError.code !== "PGRST116") {
          console.warn(
            `Warning: Could not delete OTP codes for profile_id: ${profileId}`,
            otpDeleteError,
          );
        }

        const { error: updateError } = await supabase
          .from("gdpr_requests")
          .update({
            status: "deleted",
            updated_at: new Date().toISOString(),
          })
          .eq("id", request.id);

        if (updateError) {
          throw new Error(
            `Failed to update GDPR request status: ${updateError.message}`,
          );
        }

        successCount++;
        console.log(`Successfully completed GDPR request ${request.id}`);
      } catch (error) {
        failCount++;
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);
        errors.push(`Profile ${request.profile_id}: ${errorMessage}`);

        console.error(`Error processing GDPR request ${request.id}:`, error);

        try {
          await supabase
            .from("gdpr_requests")
            .update({
              status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", request.id);
        } catch (updateError) {
          console.error(
            `Failed to update status to 'failed' for request ${request.id}:`,
            updateError,
          );
        }
      }
    }

    const result = {
      success: true,
      message: `Processed ${gdprRequests.length} GDPR requests`,
      processed: gdprRequests.length,
      successful: successCount,
      deferred: deferredCount,
      failed: failCount,
      ...(errors.length > 0 && { errors }),
    };

    console.log("GDPR deletion process completed:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in delete_old_profiles function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
