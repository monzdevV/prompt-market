// Solo aplica al CLI (`npm run studio`). El pipeline pasa las opciones directamente a @remotion/renderer.
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
