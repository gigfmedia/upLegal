import { ProfileFormData } from '@/pages/lawyer/ProfilePage';

export interface ProfileCompletionData extends Omit<ProfileFormData, 'specialties' | 'languages'> {
  specialties: string[];
  languages: string[];
  servicesCount?: number;
}

export const calculateProfileCompletion = (profileData: ProfileCompletionData): number => {
  // Define interfaces for education object
  interface EducationObject {
    degree?: string;
    university?: string;
    start_year?: string | number | null;
    end_year?: string | number | null;
    study_start_year?: string | number | null;
    study_end_year?: string | number | null;
  }

  // Extract education data
  let educationDegree = '';
  let university = profileData.university || '';
  let studyStartYear = profileData.study_start_year || '';
  let studyEndYear = profileData.study_end_year || '';
  
  // Handle education field which could be a string or object
  if (profileData.education) {
    if (typeof profileData.education === 'object') {
      // If education is an object, extract degree
      const edu = profileData.education as EducationObject;
      educationDegree = edu.degree || '';
      // Use education object values if they exist, otherwise keep the direct values
      university = edu.university || university;
      studyStartYear = edu.start_year || edu.study_start_year || studyStartYear;
      studyEndYear = edu.end_year || edu.study_end_year || studyEndYear;
    } else {
      // If education is a string, use it as the degree
      educationDegree = profileData.education;
    }
  }

  // Validate education years if provided
  let hasValidEducationYears = true;
  if (studyStartYear || studyEndYear) {
    const startYear = studyStartYear ? parseInt(studyStartYear) : null;
    const endYear = studyEndYear ? parseInt(studyEndYear) : null;
    hasValidEducationYears = !(startYear && endYear && endYear < startYear);
  }

  // Required fields for profile completion
  const requiredFields = [
    { name: 'first_name', value: profileData.first_name },
    { name: 'last_name', value: profileData.last_name },
    { name: 'bio', value: profileData.bio },
    { name: 'phone', value: profileData.phone },
    { name: 'specialties', value: !!profileData.specialties?.length },
    { name: 'experience', value: (profileData.experience_years || 0) > 0 },
    { name: 'hourly_rate', value: (profileData.hourly_rate_clp || 0) > 0 },
    { name: 'languages', value: !!profileData.languages?.length },
    { 
      name: 'education', 
      value: !!(educationDegree && hasValidEducationYears) 
    },
    { 
      name: 'university', 
      value: !!university 
    },
    { 
      name: 'certifications', 
      value: !!profileData.certifications?.length 
    },
    { name: 'bar_association_number', value: profileData.bar_association_number },
    { name: 'rut', value: profileData.rut },
    { name: 'avatar_url', value: profileData.avatar_url },
    { name: 'has_services', value: (profileData.servicesCount || 0) > 0 }
  ];
  const completedFields = requiredFields.filter(field => {
    // Check if the field has a value
    if (Array.isArray(field.value)) {
      return field.value.length > 0;
    }
    return !!field.value;
  }).length;

  const totalFields = requiredFields.length;
  
  // Calculate percentage and round to nearest integer
  const completionPercentage = Math.round((completedFields / totalFields) * 100);
  
  // Ensure the percentage is between 0 and 100
  return Math.min(100, Math.max(0, completionPercentage));
};
