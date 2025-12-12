import React from "react";
import { HomeScreen } from "./components/HomeScreen";
import { AuthScreen } from "./components/AuthScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { useUser } from "./state/PlanContext";
import { useTheme } from "./state/ThemeContext";
import { ChatScreen } from "./components/ChatScreen";
import { ActivitiesScreen } from "./components/ActivitiesScreen";
import { ActivitiesHubScreen } from "./components/ActivitiesHubScreen";
import { BreathingExerciseScreen } from "./components/BreathingExerciseScreen";
import { MazeScreen } from "./components/MazeScreen";
import { WalkingResetScreen } from "./components/WalkingResetScreen";
import { PowerNapScreen } from "./components/PowerNapScreen";
import { PearlRippleScreen } from "./components/PearlRippleScreen";
import { GroundingExperience } from "./components/GroundingExperience";
import { RainWindowScreen } from "./components/RainWindowScreen";
import EchoScreen from "./components/EchoScreen";
import { RisingScreen } from "./components/RisingScreen";
import { BubbleScreen } from "./components/BubbleScreen";
import { JournalScreen } from "./components/JournalScreen";
import { EntriesScreen } from "./components/EntriesScreen";
import { TracePatternsScreen } from "./components/TracePatternsScreen";
import { FullPatternsReportScreen } from "./components/FullPatternsReportScreen";
import { HelpScreen } from "./components/HelpScreen";
import { InThisSpaceScreen } from "./components/InThisSpaceScreen";
import { CrisisScreen } from "./components/CrisisScreen";
import { PrivacyScreen } from "./components/PrivacyScreen";
import { TermsScreen } from "./components/TermsScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { AccountSetupScreen } from "./components/AccountSetupScreen";
import { PaymentScreen } from "./components/PaymentScreen";
import { PaymentSuccessOverlay } from "./components/PaymentSuccessOverlay";
import { AmbientAudioPlayer } from "./components/AmbientAudioPlayer";
import AuthModal from "./components/AuthModal";
import { PasscodeLockScreen } from "./components/PasscodeLockScreen";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabaseClient";
import { initOneSignal } from "./lib/onesignalClient";

export default function App() {
  const {
    selectedPlan,
    profile,
    isUpgrading,
    setIsUpgrading,
    ambienceEnabled,
    ambienceVolume,
  } = useUser();
  const { theme } = useTheme();
  const [currentScreen, setCurrentScreen] = React.useState<
    | "home"
    | "auth"
    | "accountsetup"
    | "payment"
    | "onboarding"
    | "chat"
    | "activities"
    | "activitieshub"
    | "breathing"
    | "maze"
    | "walking"
    | "powernap"
    | "pearlripple"
    | "grounding"
    | "rainwindow"
    | "echo"
    | "rising"
    | "bubble"
    | "journal"
    | "entries"
    | "patterns"
    | "fullpatterns"
    | "help"
    | "inthisspace"
    | "crisis"
    | "privacy"
    | "terms"
    | "profile"
  >("home");
  const [showPaymentSuccess, setShowPaymentSuccess] = React.useState(false);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [ambientAudioStarted, setAmbientAudioStarted] = React.useState(false);
  const [ambientCrossfadeActive, setAmbientCrossfadeActive] =
    React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const [isLocked, setIsLocked] = React.useState(false);
  const [biometricAvailable, setBiometricAvailable] = React.useState(false);

  // Check if passcode is enabled on mount
  React.useEffect(() => {
    const passcode = localStorage.getItem("trace-passcode");
    if (passcode) {
      setIsLocked(true);
    }

    // Check biometric availability
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => setBiometricAvailable(available))
        .catch(() => setBiometricAvailable(false));
    }
  }, []);

  // Supabase session listener - store logged-in user state
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // Initialize OneSignal when user is authenticated
  React.useEffect(() => {
    if (!user) return;
    initOneSignal(user.id);
  }, [user?.id]);

  const userName = profile?.name || "there";

  const screensWithOwnAudio = [
    "home",
    "onboarding",
    "breathing",
    "powernap",
    "pearlripple",
    "walking",
    "grounding",
    "maze",
    "rainwindow",
    "echo",
    "rising",
  ];
  const shouldPlayAmbient =
    ambientAudioStarted &&
    ambienceEnabled &&
    (!screensWithOwnAudio.includes(currentScreen) || ambientCrossfadeActive);

  React.useEffect(() => {
    const screensToTriggerAudio = [
      "auth",
      "chat",
      "activities",
      "activitieshub",
      "journal",
      "entries",
      "patterns",
      "profile",
      "help",
    ];
    if (!ambientAudioStarted && screensToTriggerAudio.includes(currentScreen)) {
      setAmbientAudioStarted(true);
    }

    // Reset crossfade flag when entering any screen with its own audio (including home)
    // Crossfade only applies during the initial home→auth transition
    if (screensWithOwnAudio.includes(currentScreen)) {
      setAmbientCrossfadeActive(false);
    }
  }, [currentScreen, ambientAudioStarted]);

  const isDark = theme === "night";

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* iPhone 15 Pro Frame */}
      <div className="relative w-[390px] h-[844px] bg-black rounded-[55px] p-[12px] shadow-2xl">
        {/* Screen Content - Apply theme texture at root level */}
        <div
          className={`w-full h-full rounded-[43px] overflow-hidden relative transition-all duration-500 ${isDark ? "night-texture" : "day-texture"}`}
          style={{ backgroundColor: "var(--bg)" }}
        >
          {/* Global Ambient Audio - always mounted, plays on screens without their own audio */}
          {ambientAudioStarted && (
            <AmbientAudioPlayer
              shouldPlay={shouldPlayAmbient}
              volume={(ambienceVolume / 100) * 0.35}
              showControls={false}
              playbackRate={0.9}
            />
          )}

          {/* Conditional Screen Rendering */}
          {currentScreen === "home" && (
            <HomeScreen
              onNavigateToAuth={() => setCurrentScreen("auth")}
              onStartAmbient={() => {
                setAmbientAudioStarted(true);
                setAmbientCrossfadeActive(true);
              }}
            />
          )}
          {currentScreen === "auth" && (
            <AuthScreen
              onCreateAccount={() => setCurrentScreen("onboarding")}
              onLogin={() => setCurrentScreen("chat")}
            />
          )}
          {currentScreen === "onboarding" && (
            <OnboardingScreen
              onContinue={() => {
                if (isUpgrading) {
                  setIsUpgrading(false);
                  if (selectedPlan === "light") {
                    setCurrentScreen("chat");
                  } else {
                    setCurrentScreen("payment");
                  }
                } else {
                  setCurrentScreen("accountsetup");
                }
              }}
            />
          )}
          {currentScreen === "accountsetup" && (
            <AccountSetupScreen
              onContinue={() => {
                if (selectedPlan === "light") {
                  // Light plan users skip payment and go straight to chat
                  setCurrentScreen("chat");
                } else {
                  setCurrentScreen("payment");
                }
              }}
              onChangePlan={() => setCurrentScreen("onboarding")}
            />
          )}
          {currentScreen === "payment" && (
            <PaymentScreen
              onComplete={() => {
                setCurrentScreen("chat");
                setShowPaymentSuccess(true);
              }}
            />
          )}
          {currentScreen === "chat" && (
            <>
              <ChatScreen
                onNavigateToActivities={() => setCurrentScreen("activitieshub")}
                onNavigateToProfile={() => setCurrentScreen("profile")}
                onNavigateToPatterns={() => setCurrentScreen("patterns")}
                onNavigateToHelp={() => setCurrentScreen("help")}
                onNavigateToJournal={() => setCurrentScreen("entries")}
                onNavigateToBreathing={() => setCurrentScreen("breathing")}
                onNavigateToGrounding={() => setCurrentScreen("grounding")}
                onNavigateToWalking={() => setCurrentScreen("walking")}
                onNavigateToMaze={() => setCurrentScreen("maze")}
                onNavigateToPowerNap={() => setCurrentScreen("powernap")}
                onNavigateToPearlRipple={() => setCurrentScreen("pearlripple")}
                onNavigateToRest={() => setCurrentScreen("powernap")}
                onNavigateToWindow={() => setCurrentScreen("rainwindow")}
                onNavigateToEcho={() => setCurrentScreen("echo")}
                shouldStartGreeting={!showPaymentSuccess}
              />
              {/* Only show success overlay for Premium/Studio after payment - never for Light */}
              {showPaymentSuccess && selectedPlan !== "light" && (
                <PaymentSuccessOverlay
                  userName={userName}
                  onStartChatting={() => setShowPaymentSuccess(false)}
                />
              )}
            </>
          )}
          {currentScreen === "activities" && (
            <ActivitiesScreen
              onStartExercise={() => setCurrentScreen("breathing")}
            />
          )}
          {currentScreen === "activitieshub" && (
            <ActivitiesHubScreen
              onStartBreathing={() => setCurrentScreen("breathing")}
              onStartMaze={() => setCurrentScreen("maze")}
              onStartWalking={() => setCurrentScreen("walking")}
              onStartPowerNap={() => setCurrentScreen("powernap")}
              onStartPearlRipple={() => setCurrentScreen("pearlripple")}
              onStartGrounding={() => setCurrentScreen("grounding")}
              onStartRainWindow={() => setCurrentScreen("rainwindow")}
              onStartEcho={() => setCurrentScreen("echo")}
              onStartRising={() => setCurrentScreen("rising")}
              onStartBubble={() => setCurrentScreen("bubble")}
              onReturnToChat={() => setCurrentScreen("chat")}
              onNavigateToPatterns={() => setCurrentScreen("patterns")}
              onNavigateToJournal={() => setCurrentScreen("entries")}
              onNavigateToProfile={() => setCurrentScreen("profile")}
              onNavigateToHelp={() => setCurrentScreen("help")}
            />
          )}
          {currentScreen === "breathing" && (
            <BreathingExerciseScreen
              onFinish={() => setCurrentScreen("chat")}
              onNavigateHome={() => setCurrentScreen("chat")}
              onNavigateActivities={() => setCurrentScreen("activitieshub")}
              onNavigateJournal={() => setCurrentScreen("entries")}
              onNavigateProfile={() => setCurrentScreen("profile")}
              onNavigateHelp={() => setCurrentScreen("help")}
            />
          )}
          {currentScreen === "maze" && (
            <MazeScreen
              onReturnToChat={() => setCurrentScreen("chat")}
              onNavigateHome={() => setCurrentScreen("chat")}
              onNavigateActivities={() => setCurrentScreen("activitieshub")}
              onNavigateJournal={() => setCurrentScreen("entries")}
              onNavigateProfile={() => setCurrentScreen("profile")}
              onNavigateHelp={() => setCurrentScreen("help")}
            />
          )}
          {currentScreen === "walking" && (
            <WalkingResetScreen
              onFinish={() => setCurrentScreen("chat")}
              onNavigateHome={() => setCurrentScreen("chat")}
              onNavigateActivities={() => setCurrentScreen("activitieshub")}
              onNavigateJournal={() => setCurrentScreen("entries")}
              onNavigateProfile={() => setCurrentScreen("profile")}
              onNavigateHelp={() => setCurrentScreen("help")}
            />
          )}
          {currentScreen === "powernap" && (
            <PowerNapScreen
              onReturnToChat={() => setCurrentScreen("chat")}
              onNavigateHome={() => setCurrentScreen("chat")}
              onNavigateActivities={() => setCurrentScreen("activitieshub")}
              onNavigateJournal={() => setCurrentScreen("entries")}
              onNavigateProfile={() => setCurrentScreen("profile")}
              onNavigateHelp={() => setCurrentScreen("help")}
            />
          )}
          {currentScreen === "pearlripple" && (
            <PearlRippleScreen
              onReturnToChat={() => setCurrentScreen("chat")}
              onNavigateToActivities={() => setCurrentScreen("activitieshub")}
              onNavigateToJournal={() => setCurrentScreen("entries")}
              onNavigateToProfile={() => setCurrentScreen("profile")}
              onNavigateToHelp={() => setCurrentScreen("help")}
              onBack={() => setCurrentScreen("activitieshub")}
            />
          )}
          {currentScreen === "grounding" && (
            <GroundingExperience
              onReturnToChat={() => setCurrentScreen("chat")}
              onNavigateToActivities={() => setCurrentScreen("activitieshub")}
              onNavigateToJournal={() => setCurrentScreen("entries")}
              onNavigateToProfile={() => setCurrentScreen("profile")}
              onNavigateToHelp={() => setCurrentScreen("help")}
              onBack={() => setCurrentScreen("activitieshub")}
            />
          )}
          {currentScreen === "rainwindow" && (
            <RainWindowScreen
              onReturnToChat={() => setCurrentScreen("chat")}
              onNavigateToActivities={() => setCurrentScreen("activitieshub")}
              onNavigateToJournal={() => setCurrentScreen("entries")}
              onNavigateToProfile={() => setCurrentScreen("profile")}
              onNavigateToHelp={() => setCurrentScreen("help")}
            />
          )}
          {currentScreen === "echo" && (
            <EchoScreen
              onBack={() => setCurrentScreen("activitieshub")}
              onReturnToChat={() => setCurrentScreen("chat")}
              onNavigateToActivities={() => setCurrentScreen("activitieshub")}
              onNavigateToJournal={() => setCurrentScreen("entries")}
              onNavigateToProfile={() => setCurrentScreen("profile")}
              onNavigateToHelp={() => setCurrentScreen("help")}
            />
          )}
          {currentScreen === "rising" && (
            <RisingScreen
              onBack={() => setCurrentScreen("activitieshub")}
              onReturnToChat={() => setCurrentScreen("chat")}
              onNavigateToActivities={() => setCurrentScreen("activitieshub")}
              onNavigateToJournal={() => setCurrentScreen("entries")}
              onNavigateToProfile={() => setCurrentScreen("profile")}
              onNavigateToHelp={() => setCurrentScreen("help")}
            />
          )}
          {currentScreen === "bubble" && (
            <BubbleScreen
              onBack={() => setCurrentScreen("activitieshub")}
              onReturnToChat={() => setCurrentScreen("chat")}
              onNavigateToActivities={() => setCurrentScreen("activitieshub")}
              onNavigateToJournal={() => setCurrentScreen("entries")}
              onNavigateToProfile={() => setCurrentScreen("profile")}
              onNavigateToHelp={() => setCurrentScreen("help")}
            />
          )}
          {currentScreen === "journal" && (
            <JournalScreen
              onReturnToChat={() => setCurrentScreen("chat")}
              onNavigateToActivities={() => setCurrentScreen("activitieshub")}
              onNavigateToProfile={() => setCurrentScreen("profile")}
              onNavigateToHelp={() => setCurrentScreen("help")}
            />
          )}
          {currentScreen === "entries" && (
            <EntriesScreen
              onNavigateHome={() => setCurrentScreen("chat")}
              onNavigateActivities={() => setCurrentScreen("activitieshub")}
              onNavigateProfile={() => setCurrentScreen("profile")}
              onNavigateHelp={() => setCurrentScreen("help")}
              onNavigateJournal={() => setCurrentScreen("journal")}
            />
          )}
          {currentScreen === "patterns" && (
            <TracePatternsScreen
              onViewFull={() => setCurrentScreen("fullpatterns")}
              onNavigateHome={() => setCurrentScreen("chat")}
              onNavigateToActivities={() => setCurrentScreen("activitieshub")}
              onNavigateToProfile={() => setCurrentScreen("profile")}
              onNavigateToHelp={() => setCurrentScreen("help")}
              onNavigateToJournal={() => setCurrentScreen("entries")}
            />
          )}
          {currentScreen === "fullpatterns" && (
            <FullPatternsReportScreen
              onBack={() => setCurrentScreen("patterns")}
              onNavigateHome={() => setCurrentScreen("chat")}
              onNavigateJournal={() => setCurrentScreen("entries")}
              onNavigateProfile={() => setCurrentScreen("profile")}
              onNavigateHelp={() => setCurrentScreen("help")}
              onNavigateActivities={() => setCurrentScreen("activitieshub")}
              onNavigatePatterns={() => setCurrentScreen("patterns")}
            />
          )}
          {currentScreen === "help" && (
            <HelpScreen
              onReturnToChat={() => setCurrentScreen("chat")}
              onNavigateToActivities={() => setCurrentScreen("activitieshub")}
              onNavigateToJournal={() => setCurrentScreen("entries")}
              onNavigateToProfile={() => setCurrentScreen("profile")}
              onNavigateToPatterns={() => setCurrentScreen("patterns")}
              onNavigateToInThisSpace={() => setCurrentScreen("inthisspace")}
              onNavigateToCrisis={() => setCurrentScreen("crisis")}
              onNavigateToPrivacy={() => setCurrentScreen("privacy")}
              onNavigateToTerms={() => setCurrentScreen("terms")}
            />
          )}
          {currentScreen === "inthisspace" && (
            <InThisSpaceScreen
              onBackToHelp={() => setCurrentScreen("help")}
              onNavigateToActivities={() => setCurrentScreen("activitieshub")}
              onNavigateToProfile={() => setCurrentScreen("profile")}
              onNavigateToPatterns={() => setCurrentScreen("patterns")}
              onNavigateToJournal={() => setCurrentScreen("entries")}
              onReturnToChat={() => setCurrentScreen("chat")}
            />
          )}
          {currentScreen === "crisis" && (
            <CrisisScreen
              onReturnToChat={() => setCurrentScreen("chat")}
              onBackToHelp={() => setCurrentScreen("help")}
              onNavigateToActivities={() => setCurrentScreen("activitieshub")}
              onNavigateToProfile={() => setCurrentScreen("profile")}
              onNavigateToPatterns={() => setCurrentScreen("patterns")}
              onNavigateToJournal={() => setCurrentScreen("entries")}
            />
          )}
          {currentScreen === "privacy" && (
            <PrivacyScreen
              onBackToHelp={() => setCurrentScreen("help")}
              onNavigateToActivities={() => setCurrentScreen("activitieshub")}
              onNavigateToProfile={() => setCurrentScreen("profile")}
              onNavigateToPatterns={() => setCurrentScreen("patterns")}
              onNavigateToJournal={() => setCurrentScreen("entries")}
              onReturnToChat={() => setCurrentScreen("chat")}
            />
          )}
          {currentScreen === "terms" && (
            <TermsScreen
              onReturnToChat={() => setCurrentScreen("chat")}
              onBackToHelp={() => setCurrentScreen("help")}
              onNavigateToActivities={() => setCurrentScreen("activitieshub")}
              onNavigateToProfile={() => setCurrentScreen("profile")}
              onNavigateToPatterns={() => setCurrentScreen("patterns")}
              onNavigateToJournal={() => setCurrentScreen("entries")}
            />
          )}
          {currentScreen === "profile" && (
            <ProfileScreen
              onNavigateToChat={() => setCurrentScreen("chat")}
              onNavigateToActivities={() => setCurrentScreen("activitieshub")}
              onNavigateToPatterns={() => setCurrentScreen("patterns")}
              onNavigateToHelp={() => setCurrentScreen("help")}
              onNavigateToJournal={() => setCurrentScreen("entries")}
              onNavigateToOnboarding={() => setCurrentScreen("onboarding")}
              onNavigateToPrivacy={() => setCurrentScreen("privacy")}
              onNavigateToTerms={() => setCurrentScreen("terms")}
            />
          )}
        </div>

        {/* Dynamic Island */}
        <div className="absolute top-[24px] left-1/2 -translate-x-1/2 w-[126px] h-[37px] bg-black rounded-full z-50" />
      </div>

      {/* Dev Navigation */}
      <div className="fixed bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg max-w-xs z-50">
        <h3 className="font-bold mb-2">Dev Navigation</h3>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setCurrentScreen("home")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Home</button>
          <button onClick={() => setCurrentScreen("auth")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Auth</button>
          <button onClick={() => setCurrentScreen("accountsetup")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Setup</button>
          <button onClick={() => setCurrentScreen("payment")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Payment</button>
          <button onClick={() => setCurrentScreen("onboarding")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Onboarding</button>
          <button onClick={() => setCurrentScreen("chat")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Chat</button>
          <button onClick={() => setCurrentScreen("activitieshub")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Activities</button>
          <button onClick={() => setCurrentScreen("breathing")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Breathing</button>
          <button onClick={() => setCurrentScreen("maze")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Maze</button>
          <button onClick={() => setCurrentScreen("walking")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Walking</button>
          <button onClick={() => setCurrentScreen("powernap")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Power Nap</button>
          <button onClick={() => setCurrentScreen("pearlripple")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Ripple</button>
          <button onClick={() => setCurrentScreen("grounding")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Grounding</button>
          <button onClick={() => setCurrentScreen("rainwindow")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Rain Window</button>
          <button onClick={() => setCurrentScreen("echo")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Echo</button>
          <button onClick={() => setCurrentScreen("rising")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Rising</button>
          <button onClick={() => setCurrentScreen("bubble")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Bubble</button>
          <button onClick={() => setCurrentScreen("entries")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Entries</button>
          <button onClick={() => setCurrentScreen("journal")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Journal</button>
          <button onClick={() => setCurrentScreen("patterns")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Patterns</button>
          <button onClick={() => setCurrentScreen("fullpatterns")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Full Patterns</button>
          <button onClick={() => setCurrentScreen("help")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Help</button>
          <button onClick={() => setCurrentScreen("profile")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Profile</button>
          <button onClick={() => setCurrentScreen("inthisspace")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">In This Space</button>
          <button onClick={() => setCurrentScreen("crisis")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Crisis</button>
          <button onClick={() => setCurrentScreen("privacy")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Privacy</button>
          <button onClick={() => setCurrentScreen("terms")} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Terms</button>
        </div>
      </div>

      {/* Auth Modal - sits above all screens */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Passcode Lock Screen */}
      {isLocked && (
        <PasscodeLockScreen
          mode="unlock"
          onUnlock={() => setIsLocked(false)}
          biometricAvailable={
            biometricAvailable &&
            localStorage.getItem("trace-biometric-enabled") === "true"
          }
          onBiometricUnlock={() => setIsLocked(false)}
        />
      )}
    </div>
  );
}
