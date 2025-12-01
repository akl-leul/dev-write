import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
      // Update profile with additional fields
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-background p-4">
      <Card className="w-full max-w-md shadow-lift">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-serif">Chronicle</CardTitle>
          <CardDescription>Your stories, beautifully told</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={mode} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    {...signInForm.register('email')}
                  />
                  {signInForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{signInForm.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    {...signInForm.register('password')}
                  />
                  {signInForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{signInForm.formState.errors.password.message}</p>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    placeholder="John Doe"
                    {...signUpForm.register('fullName')}
                  />
                  {signUpForm.formState.errors.fullName && (
                    <p className="text-sm text-destructive">{signUpForm.formState.errors.fullName.message}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-age">Age</Label>
                    <Input
                      id="signup-age"
                      type="number"
                      {...signUpForm.register('age', { valueAsNumber: true })}
                    />
                    {signUpForm.formState.errors.age && (
                      <p className="text-sm text-destructive">{signUpForm.formState.errors.age.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-gender">Gender</Label>
                    <Select onValueChange={(value) => signUpForm.setValue('gender', value)}>
                      <SelectTrigger id="signup-gender">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    {signUpForm.formState.errors.gender && (
                      <p className="text-sm text-destructive">{signUpForm.formState.errors.gender.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="+1234567890"
                    {...signUpForm.register('phone')}
                  />
                  {signUpForm.formState.errors.phone && (
                    <p className="text-sm text-destructive">{signUpForm.formState.errors.phone.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    {...signUpForm.register('email')}
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{signUpForm.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    {...signUpForm.register('password')}
                  />
                  {signUpForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{signUpForm.formState.errors.password.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm Password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    {...signUpForm.register('confirmPassword')}
                  />
                  {signUpForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">{signUpForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                
                <Button type="submit" className="w-full bg-gradient-accent" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
