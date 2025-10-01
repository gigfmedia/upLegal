/**
 * Extracts education data from user metadata, handling both old and new formats
 */
export const getEducationData = (userData: any) => {
  let education = '';
  let university = '';
  let study_start_year = '';
  let study_end_year = '';
  
  if (userData.education && typeof userData.education === 'object') {
    // New format: education is an object
    education = userData.education.degree || '';
    university = userData.education.university || userData.university || '';
    study_start_year = userData.education.start_year || userData.study_start_year || '';
    study_end_year = userData.education.end_year || userData.study_end_year || '';
  } else {
    // Old format: separate fields
    education = userData.education || '';
    university = userData.university || '';
    study_start_year = userData.study_start_year || '';
    study_end_year = userData.study_end_year || '';
  }
  
  return { education, university, study_start_year, study_end_year };
};
