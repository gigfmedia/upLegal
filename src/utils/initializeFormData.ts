import { getEducationData } from './educationUtils';

interface UserMetadata {
  first_name?: string;
  last_name?: string;
  bio?: string;
  phone?: string;
  location?: string;
  website?: string;
  specialties?: string[] | string;
  specialization?: string[] | string;
  experience_years?: number;
  hourly_rate_clp?: number;
  languages?: string[];
  education?: any;
  university?: string;
  study_start_year?: number | null;
  study_end_year?: number | null;
  bar_association_number?: string;
  rut?: string;
  pjud_verified?: boolean;
  zoom_link?: string;
  avatar_url?: string;
}

export const initializeFormData = (userMetadata: UserMetadata) => {
  // Get education data using our utility function
  const { education } = getEducationData(userMetadata);
  
  // Handle specialties/specialization field
  let specialties: string[] = [];
  const specialtiesSource = userMetadata.specialties || userMetadata.specialization;
  
  if (Array.isArray(specialtiesSource)) {
    specialties = [...specialtiesSource];
  } else if (typeof specialtiesSource === 'string') {
    specialties = [specialtiesSource];
  }
  
  // Create the form data object with only fields that exist in the database
  const formData = {
    first_name: userMetadata.first_name || '',
    last_name: userMetadata.last_name || '',
    bio: userMetadata.bio || '',
    phone: userMetadata.phone || '',
    location: userMetadata.location || '',
    website: userMetadata.website || '',
    specialties,
    experience: userMetadata.experience_years || 0,
    hourly_rate: userMetadata.hourly_rate_clp || 0,
    languages: Array.isArray(userMetadata.languages) ? [...userMetadata.languages] : [],
    education: education || '',
    university: userMetadata.university || '',
    study_start_year: userMetadata.study_start_year || null,
    study_end_year: userMetadata.study_end_year || null,
    bar_association_number: userMetadata.bar_association_number || '',
    rut: userMetadata.rut || '',
    pjud_verified: userMetadata.pjud_verified || false,
    zoom_link: userMetadata.zoom_link || '',
    avatar_url: userMetadata.avatar_url || ''
  };

  return formData;
};
