import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, Eye, EyeOff, ArrowLeft, Check, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const EDUCATION_LEVELS = [
  { value: "college", label: "Collège" },
  { value: "lycee", label: "Lycée" },
  { value: "bac", label: "Bac" },
  { value: "bac+1", label: "Bac+1" },
  { value: "bac+2", label: "Bac+2 (BTS, DUT)" },
  { value: "licence", label: "Licence (Bac+3)" },
  { value: "master1", label: "Master 1 (Bac+4)" },
  { value: "master2", label: "Master 2 (Bac+5)" },
  { value: "doctorat", label: "Doctorat" },
  { value: "autre", label: "Autre" },
  { value: "non_etudiant", label: "Non étudiant" },
];

const PASSWORD_REQUIREMENTS = [
  { id: "length", label: "8 caractères minimum", check: (p: string) => p.length >= 8 },
  { id: "uppercase", label: "1 majuscule", check: (p: string) => /[A-Z]/.test(p) },
  { id: "lowercase", label: "1 minuscule", check: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "1 chiffre", check: (p: string) => /[0-9]/.test(p) },
  { id: "special", label: "1 caractère spécial (!@#$%^&*)", check: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    age: "",
    educationLevel: "",
    gender: "",
    termsAccepted: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validatePassword = (password: string) => {
    return PASSWORD_REQUIREMENTS.every(req => req.check(password));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "Le prénom est requis";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Le nom est requis";
    }
    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email invalide";
    }
    if (!formData.password) {
      newErrors.password = "Le mot de passe est requis";
    } else if (!validatePassword(formData.password)) {
      newErrors.password = "Le mot de passe ne respecte pas les critères";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    }
    if (!formData.age) {
      newErrors.age = "L'âge est requis";
    } else if (isNaN(Number(formData.age)) || Number(formData.age) < 13 || Number(formData.age) > 120) {
      newErrors.age = "Âge invalide (13-120)";
    }
    if (!formData.educationLevel) {
      newErrors.educationLevel = "Le niveau d'études est requis";
    }
    if (!formData.termsAccepted) {
      newErrors.termsAccepted = "Vous devez accepter les CGU";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Veuillez corriger les erreurs dans le formulaire");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Update profile with additional data
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: formData.firstName,
            last_name: formData.lastName,
            full_name: `${formData.firstName} ${formData.lastName}`,
            age: parseInt(formData.age),
            education_level: formData.educationLevel,
            gender: formData.gender || null,
            terms_accepted_at: new Date().toISOString(),
          })
          .eq('id', data.user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
        }

        // Send welcome email + admin notification via edge function
        try {
          // Welcome email to user
          await supabase.functions.invoke('send-system-email', {
            body: {
              type: 'welcome',
              to: formData.email,
              firstName: formData.firstName,
            },
          });

          // Notify admin of new user
          await supabase.functions.invoke('send-system-email', {
            body: {
              type: 'new_user_admin',
              userEmail: formData.email,
              firstName: formData.firstName,
            },
          });
        } catch (emailError) {
          console.error('Email notification error:', emailError);
        }
      }

      toast.success("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
      navigate("/auth");
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.message?.includes('already registered')) {
        toast.error("Un compte existe déjà avec cet email");
      } else {
        toast.error(error.message || "Erreur lors de la création du compte");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle("/auth");

      if (error) {
        toast.error(error.message || "Erreur lors de l'inscription Google");
      }
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de l'inscription Google");
    } finally {
      setGoogleLoading(false);
    }
  };

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="p-0 h-auto">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
          </div>
          <CardTitle className="text-2xl font-bold">Créer un compte</CardTitle>
          <CardDescription>
            Inscrivez-vous pour commencer votre prospection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
            className="w-full"
            variant="outline"
            size="lg"
          >
            {googleLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Inscription en cours...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-5 w-5" />
                S'inscrire avec Google
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou avec email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  placeholder="Jean"
                  value={formData.firstName}
                  onChange={(e) => updateFormData("firstName", e.target.value)}
                  disabled={loading}
                  className={errors.firstName ? "border-red-500" : ""}
                />
                {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  placeholder="Dupont"
                  value={formData.lastName}
                  onChange={(e) => updateFormData("lastName", e.target.value)}
                  disabled={loading}
                  className={errors.lastName ? "border-red-500" : ""}
                />
                {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="jean.dupont@email.com"
                value={formData.email}
                onChange={(e) => updateFormData("email", e.target.value)}
                disabled={loading}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => updateFormData("password", e.target.value)}
                  disabled={loading}
                  className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.password && (
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {PASSWORD_REQUIREMENTS.map(req => (
                    <div key={req.id} className="flex items-center gap-1 text-xs">
                      {req.check(formData.password) ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <X className="h-3 w-3 text-red-500" />
                      )}
                      <span className={req.check(formData.password) ? "text-green-600" : "text-muted-foreground"}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                  disabled={loading}
                  className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Âge *</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="25"
                  min="13"
                  max="120"
                  value={formData.age}
                  onChange={(e) => updateFormData("age", e.target.value)}
                  disabled={loading}
                  className={errors.age ? "border-red-500" : ""}
                />
                {errors.age && <p className="text-xs text-red-500">{errors.age}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="education">Niveau d'études *</Label>
                <Select
                  value={formData.educationLevel}
                  onValueChange={(value) => updateFormData("educationLevel", value)}
                  disabled={loading}
                >
                  <SelectTrigger className={errors.educationLevel ? "border-red-500" : ""}>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.educationLevel && <p className="text-xs text-red-500">{errors.educationLevel}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Genre</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => updateFormData("gender", value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="homme">Homme</SelectItem>
                  <SelectItem value="femme">Femme</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={formData.termsAccepted}
                onCheckedChange={(checked) => updateFormData("termsAccepted", checked === true)}
                disabled={loading}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="terms"
                  className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${errors.termsAccepted ? "text-red-500" : ""}`}
                >
                  J'accepte les{" "}
                  <Link to="/terms" className="text-primary hover:underline" target="_blank">
                    conditions générales d'utilisation
                  </Link>{" "}
                  et la{" "}
                  <Link to="/privacy-policy" className="text-primary hover:underline" target="_blank">
                    politique de confidentialité
                  </Link>
                  *
                </label>
                {errors.termsAccepted && <p className="text-xs text-red-500">{errors.termsAccepted}</p>}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création du compte...
                </>
              ) : (
                "Créer mon compte"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link to="/auth" className="text-primary hover:underline font-medium">
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;