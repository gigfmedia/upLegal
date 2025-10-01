import { getEducationData } from './educationUtils';

export const initializeFormData = (userMetadata: any) => {
  // Get education data using our utility function
  const { education, university, study_start_year, study_end_year } = getEducationData(userMetadata);
  
  return {
    first_name: userMetadata.first_name || '',
    last_name: userMetadata.last_name || '',
    bio: userMetadata.bio || '',
    phone: userMetadata.phone || '',
    location: userMetadata.location || '',
    website: userMetadata.website || '',
    specialties: userMetadata.specialties || [],
    experience: userMetadata.experience || 0,
    hourly_rate: userMetadata.hourly_rate || 0,
    languages: userMetadata.languages || [],
    education,
    university,
    study_start_year,
    study_end_year,
    bar_association_number: userMetadata.bar_association_number || '',
    rut: userMetadata.rut || '',
    pjud_verified: userMetadata.pjud_verified || false,
    zoom_link: userMetadata.zoom_link || '',
    avatar_url: userMetadata.avatar_url || ''
  };
};
