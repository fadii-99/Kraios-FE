/**
 * Central API module re-exporting client and auth service helpers.
 */
export {
  API_BASE_URL,
  apiClient,
  apiClient as apiRequest,
  parseApiError,
  ensureCsrfToken,
  getCsrfToken,
} from './api/client'

export { tokenStorage } from './api/tokenStorage'

export {
  AUTH_ENDPOINTS,
  submitSignupRequest,
  loginUser,
  logoutUser,
  getCurrentUser,
  fetchCsrfToken,
} from './api/auth'

export {
  SUPPORT_ENDPOINTS,
  CONTACT_TOPICS,
  submitContactRequest,
} from './api/support'

export {
  BOOKING_ENDPOINTS,
  toMonthKey,
  fetchBookingDays,
  fetchBookingSlots,
} from './api/booking'

export {
  PROFILE_ENDPOINTS,
  EDITABLE_PROFILE_FIELDS,
  VERIFICATION_KEYS,
  readVerificationId,
  clearVerificationId,
  fetchProfile,
  updateProfile,
  requestPasswordChange,
  confirmPasswordChange,
  requestAccountDeletion,
  confirmAccountDeletion,
} from './api/profile'

export {
  PROJECT_ENDPOINTS,
  ANGLE_VALUES,
  ARCHIVE_SCOPES,
  DOCUMENT_TYPE_VALUES,
  RENDER_STYLE_VALUES,
  listProjects,
  createProject,
  fetchProject,
  renameProject,
  deleteProject,
  fetchProjectOutput,
  finishProject,
  fetchFloorPlanConversation,
  fetchFloorPlanHistory,
  uploadFloorPlan,
  generateFloorPlan,
  editFloorPlan,
  approveFloorPlanVersion,
  fetchThreeDConversation,
  fetchThreeDHistory,
  generateThreeD,
  editThreeD,
  generateThreeDAngle,
  approveThreeDVersion,
  fetchBoqConversation,
  postBoqMessage,
  generateBoq,
  fetchBoqVersions,
  createManualBoqVersion,
  approveBoqVersion,
  skipBoq,
  fetchBoqDocuments,
  uploadBoqDocument,
  updateBoqDocument,
  deleteBoqDocument,
  deleteConversationMessage,
  fetchJob,
  fetchProjectAssets,
  queueProjectArchive,
} from './api/projects'

export {
  JOB_STATUS,
  JobFailedError,
  isJobSettled,
  jobFromResponse,
  jobIdFromResponse,
  waitForJob,
} from './api/jobs'

export {
  apiUrl,
  assetSrc,
  assetDownloadPath,
  boqCsvPath,
  dataUrlToFile,
  downloadApiFile,
  fetchApiBlob,
} from './api/files'
