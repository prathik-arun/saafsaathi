/** Splash: teal background, white logo, tagline. */
import { Logo } from '../components/Logo';

export function Splash() {
  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-4 bg-primary text-on-primary" role="status">
      <div className="anim-pop">
        <Logo size={88} bubble="var(--on-primary)" leaf="var(--primary)" />
      </div>
      <h1 className="t-display">SaafSaathi</h1>
      <p className="t-body opacity-90">Sort it. Report it. Clean it.</p>
    </div>
  );
}
