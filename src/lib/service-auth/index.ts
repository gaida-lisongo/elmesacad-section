export { computeAuthAdminSignature } from "./hmac";
export {
  getAuthServiceBaseUrl,
  getGlobalSharedKeyForHmac,
  getAuthClientCredentials,
  getStaticServicesBearerJwt,
} from "./config";
export { getServiceJwt, prefetchServiceJwt, clearServiceJwtCache } from "./getServiceJwt";
export {
  getTitulaireServiceBase,
  getEtudiantServiceBase,
  getMailServiceBase,
  fetchTitulaireService,
  fetchEtudiantService,
} from "./upstreamFetch";
