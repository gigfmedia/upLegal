import { Lawyer } from "@/components/LawyerCard";

export const isLawyerProfileComplete = (lawyer: Lawyer): boolean => {
  return Boolean(
    lawyer.verified && 
    lawyer.hourlyRate > 0 &&
    lawyer.bio && 
    lawyer.bio.trim() !== '' && 
    lawyer.specialties && 
    lawyer.specialties.length > 0 &&
    lawyer.location && 
    lawyer.location.trim() !== ''
  );
};

export const sortLawyersByCompleteness = (lawyers: Lawyer[]): Lawyer[] => {
  return [...lawyers].sort((a, b) => {
    const aComplete = isLawyerProfileComplete(a);
    const bComplete = isLawyerProfileComplete(b);
    
    if (aComplete && !bComplete) return -1;
    if (!aComplete && bComplete) return 1;
    return 0;
  });
};
