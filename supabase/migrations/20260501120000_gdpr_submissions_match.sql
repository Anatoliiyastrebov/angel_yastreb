-- Match wellness `submissions` rows to GDPR profile_id (OTP contact_identifier).
-- profile_id for phone auth: digits-only (see verify-otp). submissions.phone: E.164-style.
-- profile_id for telegram: lowercase handle without @.

CREATE OR REPLACE FUNCTION public.submission_matches_gdpr_profile(
  p_phone TEXT,
  p_answers JSONB,
  p_profile_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      length(regexp_replace(trim(lower(COALESCE(p_profile_id, ''))), '\D', '', 'g')) >= 8
      AND regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g')
        = regexp_replace(trim(lower(COALESCE(p_profile_id, ''))), '\D', '', 'g')
    )
    OR (
      length(regexp_replace(trim(lower(COALESCE(p_profile_id, ''))), '\D', '', 'g')) < 8
      AND regexp_replace(
          trim(lower(COALESCE(p_answers -> 'contactData' ->> 'telegram', ''))),
          '^@',
          ''
        ) <> ''
      AND regexp_replace(
          trim(lower(COALESCE(p_answers -> 'contactData' ->> 'telegram', ''))),
          '^@',
          ''
        ) = regexp_replace(trim(lower(COALESCE(p_profile_id, ''))), '^@', '')
    ),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.submission_ids_for_gdpr_profile(p_profile_id TEXT)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM submissions s
  WHERE public.submission_matches_gdpr_profile(s.phone::TEXT, s.answers, p_profile_id);
$$;

REVOKE ALL ON FUNCTION public.submission_matches_gdpr_profile(TEXT, JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submission_ids_for_gdpr_profile(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submission_matches_gdpr_profile(TEXT, JSONB, TEXT) TO postgres;
GRANT EXECUTE ON FUNCTION public.submission_matches_gdpr_profile(TEXT, JSONB, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION public.submission_ids_for_gdpr_profile(TEXT) TO postgres;
GRANT EXECUTE ON FUNCTION public.submission_ids_for_gdpr_profile(TEXT) TO service_role;

COMMENT ON FUNCTION public.submission_ids_for_gdpr_profile IS 'IDs of submissions to erase for GDPR automation (service_role / Edge Function only).';
