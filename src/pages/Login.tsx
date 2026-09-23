import { SignIn } from '@clerk/react';

const Login = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
      <SignIn routing="path" path="/login" signUpUrl="/register" />
    </div>
  );
};

export default Login;

