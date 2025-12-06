import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PenLine, ArrowLeft } from 'lucide-react';

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  age: z.number().min(13, 'Must be at least 13 years old').max(120),
  gender: z.string().min(1, 'Please select a gender'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type SignUpForm = z.infer<typeof signUpSchema>;
type SignInForm = z.infer<typeof signInSchema>;

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signUp, signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const mode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      age: 18,
      gender: '',
    },
  });

  const signInForm = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (user) {
      navigate('/feed');
    }
  }, [user, navigate]);

  const handleSignUp = async (data: SignUpForm) => {
    setLoading(true);
    const { error } = await signUp(
      data.email,
      data.password,
      data.fullName,
      data.phone,
      data.age,
      data.gender
    );
    
    if (!error) {
      navigate('/feed');
    }
    setLoading(false);
  };

  const handleSignIn = async (data: SignInForm) => {
    setLoading(true);
    const { error } = await signIn(data.email, data.password);
    if (!error) {
      navigate('/feed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white font-sans selection:bg-blue-100 relative p-4">
      
      {/* Background Dot Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none" 
           style={{
             backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
             backgroundSize: '24px 24px'
           }}>
      </div>

      <div className="absolute top-6 left-6 z-20">
        <Link to="/">
          <Button variant="ghost" className="text-slate-500 hover:text-slate-900 gap-2 pl-0 hover:bg-transparent">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-md bg-white shadow-2xl rounded-2xl border border-slate-100 z-10 relative overflow-hidden">
        {/* Decorative top bar */}
        <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-600 w-full"></div>

        <CardHeader className="space-y-4 text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg mb-2">
            <PenLine size={24} />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">Welcome to Chronicle</CardTitle>
            <CardDescription className="text-slate-500">
              Sign in to continue your writing journey
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <Tabs defaultValue={mode} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-xl mb-6">
              <TabsTrigger 
                value="signin" 
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
              <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-slate-700 font-medium">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    className="bg-slate-50 text-slate-900 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    {...signInForm.register('email')}
                  />
                  {signInForm.formState.errors.email && (
                    <p className="text-sm text-red-500 font-medium">{signInForm.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password" className="text-slate-700 font-medium">Password</Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="signin-password"
                    type="password"
                    className="bg-slate-50 text-slate-900 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    {...signInForm.register('password')}
                  />
                  {signInForm.formState.errors.password && (
                    <p className="text-sm text-red-500 font-medium">{signInForm.formState.errors.password.message}</p>
                  )}
                </div>
                
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 rounded-xl py-6" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>

                <div className="text-center text-sm text-slate-500 mt-4">
                  Don't have an account?{' '}
                  <Link to="/auth?mode=signup" className="text-blue-600 hover:underline font-bold">
                    Create one now
                  </Link>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-slate-700 font-medium">Full Name</Label>
                  <Input
                    id="signup-name"
                    placeholder="John Doe"
                    className="bg-slate-50 text-slate-900 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    {...signUpForm.register('fullName')}
                  />
                  {signUpForm.formState.errors.fullName && (
                    <p className="text-sm text-red-500 font-medium">{signUpForm.formState.errors.fullName.message}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-age" className="text-slate-700 font-medium">Age</Label>
                    <Input
                      id="signup-age"
                      type="number"
                      className="bg-slate-50 text-slate-900 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      {...signUpForm.register('age', { valueAsNumber: true })}
                    />
                    {signUpForm.formState.errors.age && (
                      <p className="text-sm text-red-500 font-medium">{signUpForm.formState.errors.age.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-gender" className="text-slate-700 font-medium">Gender</Label>
                    <Select onValueChange={(value) => signUpForm.setValue('gender', value)}>
                      <SelectTrigger id="signup-gender" className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                    </Select>
                    {signUpForm.formState.errors.gender && (
                      <p className="text-sm text-red-500 font-medium">{signUpForm.formState.errors.gender.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-phone" className="text-slate-700 font-medium">Phone</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="+1234567890"
                    className="bg-slate-50 text-slate-900 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    {...signUpForm.register('phone')}
                  />
                  {signUpForm.formState.errors.phone && (
                    <p className="text-sm text-red-500 font-medium">{signUpForm.formState.errors.phone.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-slate-700 font-medium">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    className="bg-slate-50 text-slate-900 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    {...signUpForm.register('email')}
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="text-sm text-red-500 font-medium">{signUpForm.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-slate-700 font-medium">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      className="bg-slate-50 text-slate-900 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      {...signUpForm.register('password')}
                    />
                    {signUpForm.formState.errors.password && (
                      <p className="text-sm text-red-500 font-medium">{signUpForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm" className="text-slate-700 font-medium">Confirm</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      className="bg-slate-50 text-slate-900 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      {...signUpForm.register('confirmPassword')}
                    />
                    {signUpForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-500 font-medium">{signUpForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>
                
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 rounded-xl py-6 mt-2" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>

                <div className="text-center text-sm text-slate-500 mt-4">
                  Already have an account?{' '}
                  <Link to="/auth" className="text-blue-600 hover:underline font-bold">
                    Sign in instead
                  </Link>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;