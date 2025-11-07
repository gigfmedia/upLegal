import { Lawyer } from "@/components/LawyerCard";

export const mockLawyers = [
  {
    id: "1",
    user_id: "user_1",
    first_name: "Gabriela Ignacia",
    last_name: "Gómez Fernández",
    specialties: ["Derecho Laboral", "Derecho de Familia"],
    rating: 4.9,
    review_count: 142,
    location: "Santiago, Chile",
    bio: "Abogada especializada en Derecho Laboral y de Familia con más de 10 años de experiencia. Me apasiona ayudar a las personas a resolver sus problemas legales de manera efectiva y compasiva.",
    avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1588&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    hourly_rate_clp: 350000,
    experience_years: 10,
    verified: true,
    role: "lawyer"
  },
  // Add more mock lawyers as needed
];
