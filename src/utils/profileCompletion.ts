import { ProfileFormData } from '@/pages/lawyer/ProfilePage';

export interface ProfileCompletionData extends Record<string, any> {
  specialties?: string[] | any;
  languages?: string[] | any;
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
  
  // Handle education field which could be a string or object
  if (profileData.education) {
    if (typeof profileData.education === 'object') {
      const edu = profileData.education as EducationObject;
      educationDegree = edu.degree || '';
      university = edu.university || university;
    } else {
      educationDegree = profileData.education;
    }
  }

  // Required fields for profile completion - Stricter criteria
  const requiredFields = [
    { name: 'first_name', value: !!profileData.first_name },
    { name: 'last_name', value: !!profileData.last_name },
    { name: 'bio', value: !!profileData.bio && profileData.bio.trim().length >= 100 },
    { name: 'phone', value: !!profileData.phone },
    { name: 'location', value: !!profileData.location },
    { name: 'specialties', value: !!profileData.specialties?.length },
    { name: 'experience', value: (profileData.experience_years || 0) > 0 },
    { name: 'hourly_rate', value: (profileData.hourly_rate_clp || 0) > 0 },
    { name: 'languages', value: !!profileData.languages?.length },
    { name: 'education', value: !!educationDegree },
    { name: 'university', value: !!university },
    { name: 'rut', value: !!profileData.rut },
    { name: 'bar_association_number', value: !!profileData.bar_association_number },
    { name: 'zoom_link', value: !!profileData.zoom_link },
    { name: 'avatar_url', value: !!profileData.avatar_url },
    { name: 'has_services', value: (profileData.servicesCount || 0) > 0 }
  ];

  const completedFields = requiredFields.filter(field => !!field.value).length;
  const totalFields = requiredFields.length;
  
  // Calculate percentage and round to nearest integer
  const completionPercentage = Math.round((completedFields / totalFields) * 100);
  
  // Ensure the percentage is between 0 and 100
  return Math.min(100, Math.max(0, completionPercentage));
};
