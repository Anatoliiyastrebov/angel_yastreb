/** Лимиты загрузки вложений анкеты — синхронно с POST /api/submissions */
export const SUBMISSION_MAX_FILES = 8;
/** На Vercel размер тела запроса ограничен тарифом; 15 MB обычно безопаснее 50 MB из старого UI. */
export const SUBMISSION_MAX_FILE_BYTES = 15 * 1024 * 1024;
