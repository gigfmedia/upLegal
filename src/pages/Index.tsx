
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Star, MapPin, Users, Shield, Scale, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { LawyerCard } from "@/components/LawyerCard";
import { Header } from "@/components/Header";

const Index = () => {
  const { user, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");

  // Mock data for lawyers - in a real app, this would come from your database
  const mockLawyers = [
    {
      id: 1,
      name: "Sarah Johnson",
      specialties: ["Corporate Law", "Business Law"],
      rating: 4.9,
      reviews: 127,
      location: "New York, NY",
      hourlyRate: 350,
      image: "/placeholder.svg",
      bio: "Expert in corporate law with 15+ years of experience helping businesses navigate complex legal challenges.",
      verified: true
    },
    {
      id: 2,
      name: "Michael Chen",
      specialties: ["Criminal Defense", "Personal Injury"],
      rating: 4.8,
      reviews: 89,
      location: "Los Angeles, CA",
      hourlyRate: 275,
      image: "/placeholder.svg",
      bio: "Dedicated criminal defense attorney with a track record of successful case outcomes.",
      verified: true
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      specialties: ["Immigration Law", "Family Law"],
      rating: 4.7,
      reviews: 156,
      location: "Miami, FL",
      hourlyRate: 225,
      image: "/placeholder.svg",
      bio: "Compassionate immigration and family law attorney serving diverse communities.",
      verified: true
    }
  ];

  const specialties = [
    "Corporate Law",
    "Criminal Defense", 
    "Immigration Law",
    "Family Law",
    "Personal Injury",
    "Real Estate Law",
    "Employment Law",
    "Intellectual Property"
  ];

  const filteredLawyers = mockLawyers.filter(lawyer => {
    const matchesSearch = lawyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lawyer.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSpecialty = selectedSpecialty === "all" || 
                            lawyer.specialties.includes(selectedSpecialty);
    return matchesSearch && matchesSpecialty;
  });

  const handleAuthClick = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header onAuthClick={handleAuthClick} />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Find the Right
            <span className="text-blue-600 block">Legal Expert</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Connect with experienced lawyers, get legal advice, and resolve your legal matters
            with confidence. Professional legal services at your fingertips.
          </p>
          
          {/* Search Section */}
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 mb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search lawyers or legal specialties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
              <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="All Specialties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specialties</SelectItem>
                  {specialties.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="lg" className="h-12 bg-blue-600 hover:bg-blue-700">
                <Search className="mr-2 h-5 w-5" />
                Search
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">500+</div>
              <div className="text-gray-600">Verified Lawyers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">10k+</div>
              <div className="text-gray-600">Cases Resolved</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">4.8★</div>
              <div className="text-gray-600">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
              <div className="text-gray-600">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose Our Platform?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-none shadow-lg">
              <CardHeader>
                <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Verified Professionals</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  All lawyers are thoroughly vetted and verified with proper licensing and credentials.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center border-none shadow-lg">
              <CardHeader>
                <Scale className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Transparent Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Clear, upfront pricing with no hidden fees. Know exactly what you'll pay before you start.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center border-none shadow-lg">
              <CardHeader>
                <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Secure & Confidential</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Your legal matters are protected with bank-level security and attorney-client privilege.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Lawyers Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Featured Lawyers
            </h2>
            <Button variant="outline">View All</Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLawyers.map((lawyer) => (
              <LawyerCard 
                key={lawyer.id} 
                lawyer={lawyer} 
                onContact={() => {
                  if (!user) {
                    handleAuthClick('login');
                  } else {
                    // Handle contact logic
                    console.log('Contact lawyer:', lawyer.name);
                  }
                }}
              />
            ))}
          </div>

          {filteredLawyers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No lawyers found matching your criteria.</p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setSelectedSpecialty("all");
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Are You a Legal Professional?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join our platform and connect with clients who need your expertise.
            Build your practice and grow your legal career.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => handleAuthClick('signup')}
            className="bg-white text-blue-600 hover:bg-gray-100"
          >
            Join as a Lawyer
          </Button>
        </div>
      </section>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </div>
  );
};

export default Index;
