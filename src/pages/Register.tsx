import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle } from "@/lib/auth-utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, User, Mail, Lock, GraduationCap, Eye, EyeOff, ArrowLeft, ArrowRight, ChevronLeft, Check, X } from "lucide-react";
import { Logo } from "@/components/Logo";

const EDUCATION_LEVELS = [
  { value: "college", label: "Collège" },
  { value: "lycee", label: "Lycée" },
  { value: "bac", label: "Baccalauréat" },
  { value: "bac+2", label: "Bac +2 (BTS, DUT, DEUG)" },
  { value: "bac+3", label: "Bac +3 (Licence, Bachelor)" },
  { value: "bac+5", label: "Bac +5 (Master, Ingénieur)" },
  { value: "doctorat", label: "Doctorat" },
  { value: "autre", label: "Autre" },
  { value: "non_etudiant", label: "Non étudiant" },
];

const PASSWORD_REQUIREMENTS = [
  { id: "length", label: "8 caractères minimum", check: (p: string) => p.length >= 8 },
  { id: "uppercase", label: "1 majuscule", check: (p: string) => /[A-Z]/.test(p) },
  { id: "lowercase", label: "1 minuscule", check: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "1 chiffre", check: (p: string) => /[0-9]/.test(p) },
  { id: "special", label: "1 caractère spécial", check: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
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

  const validatePassword = (password: string) =>
    PASSWORD_REQUIREMENTS.every((req) => req.check(password));

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = "Le prénom est requis";
    if (!formData.email.trim()) newErrors.email = "L'email est requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Email invalide";
    if (!formData.password) newErrors.password = "Le mot de passe est requis";
    else if (!validatePassword(formData.password)) newErrors.password = "Le mot de passe ne respecte pas les critères";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    if (!formData.age) newErrors.age = "L'âge est requis";
    else if (isNaN(Number(formData.age)) || Number(formData.age) < 13 || Number(formData.age) > 120) newErrors.age = "Âge invalide (13-120)";
    if (!formData.educationLevel) newErrors.educationLevel = "Le niveau d'études est requis";
    if (!formData.termsAccepted) newErrors.termsAccepted = "Vous devez accepter les CGU";
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
        await supabase.from("profiles").update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          full_name: `${formData.firstName} ${formData.lastName}`.trim(),
          age: parseInt(formData.age),
          education_level: formData.educationLevel,
          gender: formData.gender || null,
          terms_accepted_at: new Date().toISOString(),
        }).eq("id", data.user.id);

        try {
          await supabase.functions.invoke("send-system-email", {
            body: { type: "welcome", to: formData.email, firstName: formData.firstName },
          });
          await supabase.functions.invoke("send-system-email", {
            body: { type: "new_user_admin", userEmail: formData.email, firstName: formData.firstName },
          });
        } catch {}
      }
      toast.success("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
      navigate("/login");
    } catch (error: any) {
      if (error.message?.includes("already registered")) {
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
      if (error) toast.error(error.message || "Erreur lors de l'inscription Google");
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de l'inscription Google");
    } finally {
      setGoogleLoading(false);
    }
  };

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-white flex flex-col lg:flex-row">

      {/* Left panel — dark branding */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{ background: "radial-gradient(circle at top left, #1e293b 0%, #0f172a 100%)" }}>
        {/* Glow blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-violet-600 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-blue-500 blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <Logo height={32} />
          <span className="text-2xl font-bold tracking-tight">Cronos</span>
        </div>

        {/* Quote block */}
        <div className="relative z-10 max-w-lg">
          <div className="mb-8 opacity-80 text-5xl">"</div>
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-8 italic">
            Cronos, l'application qui vous fait gagner du temps sur votre recherche d'emploi.
          </h1>
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm p-4 rounded-2xl w-fit border border-white/10">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm text-gray-300">
              Créez, comparez et transmettez votre CV en un temps record avec Cronos
            </p>
          </div>
        </div>

        {/* Footer links */}
        <div className="relative z-10 flex gap-6 text-sm text-gray-400">
          <Link to="/privacy-policy" className="hover:text-white transition-colors">Politique de confidentialité</Link>
          <Link to="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-7/12 xl:w-1/2 h-full flex flex-col bg-white">

        {/* Top bar */}
        <div className="flex justify-between items-center p-6 lg:px-12 lg:pt-8 shrink-0">
          <button
            onClick={() => navigate("/")}
            className="text-gray-500 hover:text-gray-800 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour
          </button>
          <Link to="/login" className="text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors">
            Déjà un compte ? Se connecter
          </Link>
        </div>

        {/* Scrollable form area */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-12 pb-8">
          <div className="max-w-md mx-auto pt-4 lg:pt-6">

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Créer un compte</h2>
              <p className="text-gray-500">Remplissez vos informations pour commencer votre recherche.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Prénom + Âge */}
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="w-full sm:w-2/3 space-y-1.5">
                  <Label htmlFor="firstName" className="text-sm font-medium text-gray-800">Prénom *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="firstName"
                      placeholder="Votre prénom"
                      value={formData.firstName}
                      onChange={(e) => updateFormData("firstName", e.target.value)}
                      disabled={loading}
                      className={`pl-10 ${errors.firstName ? "border-red-500" : "border-gray-200"} focus-visible:ring-violet-500`}
                    />
                  </div>
                  {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
                </div>
                <div className="w-full sm:w-1/3 space-y-1.5">
                  <Label htmlFor="age" className="text-sm font-medium text-gray-800">Âge *</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="25"
                    min="13"
                    max="120"
                    value={formData.age}
                    onChange={(e) => updateFormData("age", e.target.value)}
                    disabled={loading}
                    className={`${errors.age ? "border-red-500" : "border-gray-200"} focus-visible:ring-violet-500`}
                  />
                  {errors.age && <p className="text-xs text-red-500">{errors.age}</p>}
                </div>
              </div>

              {/* Nom */}
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm font-medium text-gray-800">Nom</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="lastName"
                    placeholder="Votre nom"
                    value={formData.lastName}
                    onChange={(e) => updateFormData("lastName", e.target.value)}
                    disabled={loading}
                    className="pl-10 border-gray-200 focus-visible:ring-violet-500"
                  />
                </div>
              </div>

              {/* Niveau d'étude */}
              <div className="space-y-1.5">
                <Label htmlFor="education" className="text-sm font-medium text-gray-800">Niveau d'étude *</Label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                  <Select
                    value={formData.educationLevel}
                    onValueChange={(value) => updateFormData("educationLevel", value)}
                    disabled={loading}
                  >
                    <SelectTrigger className={`pl-10 ${errors.educationLevel ? "border-red-500" : "border-gray-200"} focus:ring-violet-500`}>
                      <SelectValue placeholder="Sélectionnez votre niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {errors.educationLevel && <p className="text-xs text-red-500">{errors.educationLevel}</p>}
              </div>

              {/* Genre */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-800">Genre <span className="text-gray-400 font-normal">(optionnel)</span></Label>
                <Select value={formData.gender} onValueChange={(v) => updateFormData("gender", v)} disabled={loading}>
                  <SelectTrigger className="border-gray-200 focus:ring-violet-500">
                    <SelectValue placeholder="Sélectionnez" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="homme">Homme</SelectItem>
                    <SelectItem value="femme">Femme</SelectItem>
                    <SelectItem value="autre">Autre / Non précisé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-gray-800">Adresse e-mail *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nom@exemple.com"
                    value={formData.email}
                    onChange={(e) => updateFormData("email", e.target.value)}
                    disabled={loading}
                    className={`pl-10 ${errors.email ? "border-red-500" : "border-gray-200"} focus-visible:ring-violet-500`}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-gray-800">Mot de passe *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => updateFormData("password", e.target.value)}
                    disabled={loading}
                    className={`pl-10 pr-10 ${errors.password ? "border-red-500" : "border-gray-200"} focus-visible:ring-violet-500`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.password && (
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    {PASSWORD_REQUIREMENTS.map((req) => (
                      <div key={req.id} className="flex items-center gap-1 text-xs">
                        {req.check(formData.password) ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <X className="h-3 w-3 text-red-400" />
                        )}
                        <span className={req.check(formData.password) ? "text-green-600" : "text-gray-400"}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-800">Confirmer le mot de passe *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                    disabled={loading}
                    className={`pl-10 pr-10 ${errors.confirmPassword ? "border-red-500" : "border-gray-200"} focus-visible:ring-violet-500`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
              </div>

              {/* Terms */}
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={formData.termsAccepted}
                  onCheckedChange={(checked) => updateFormData("termsAccepted", checked === true)}
                  disabled={loading}
                  className="mt-0.5"
                />
                <label
                  htmlFor="terms"
                  className={`text-sm leading-snug cursor-pointer ${errors.termsAccepted ? "text-red-500" : "text-gray-600"}`}
                >
                  J'accepte les{" "}
                  <Link to="/terms-of-service" className="text-violet-600 hover:underline font-medium" target="_blank">
                    conditions générales d'utilisation
                  </Link>{" "}
                  et la{" "}
                  <Link to="/privacy-policy" className="text-violet-600 hover:underline font-medium" target="_blank">
                    politique de confidentialité
                  </Link>
                </label>
              </div>
              {errors.termsAccepted && <p className="text-xs text-red-500 -mt-3">{errors.termsAccepted}</p>}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Création du compte...</>
                ) : (
                  <>S'inscrire gratuitement <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-7">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-white text-gray-400 uppercase font-semibold tracking-wider">Ou continuer avec</span>
              </div>
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={googleLoading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              {googleLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Connexion en cours...</>
              ) : (
                <>
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" />
                  Google
                </>
              )}
            </button>

            <p className="mt-8 text-center text-sm text-gray-500">
              Vous avez déjà un compte ?{" "}
              <Link to="/login" className="font-medium text-violet-600 hover:text-violet-700 transition-colors">
                Se connecter
              </Link>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
