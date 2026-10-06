import { loadFont as loadDisplay } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadText } from "@remotion/google-fonts/InstrumentSans";
import { loadFont as loadSerif } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const display = loadDisplay("normal", { weights: ["600", "800"], subsets: ["latin", "latin-ext"] }).fontFamily;
export const text = loadText("normal", { weights: ["500", "700"], subsets: ["latin", "latin-ext"] }).fontFamily;
export const serif = loadSerif("italic", { weights: ["500", "800"], subsets: ["latin", "latin-ext"] }).fontFamily; // 800: las citas usan Headline (peso 800)
export const mono = loadMono("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily;
