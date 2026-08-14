import { text } from "stream/consumers";
import SupportPage from "./support";
import OnboardingPage from "./cs";

export default function Home() {
  return (
    <div className="h-screen flex overflow-hidden">
      <div className="w-[60%]">
        <SupportPage />
      </div>

      <div className="w-[40%] border-l border-gray-200">
        <h1 className="text-center" text-xl>
          Espaco para time de CS - Onboarding e ongoing
        </h1>

        <OnboardingPage />
      </div>
    </div>
  );
}
