import { SignUp } from '@clerk/react';

const Register = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
      <SignUp routing="path" path="/register" signInUrl="/login" />
    </div>
  );
};

export default Register;

