import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Em ambientes sem download do navegador do Remotion, aponte para um
// chrome-headless-shell já instalado: REMOTION_CHROME=/caminho/chrome-headless-shell
if (process.env.REMOTION_CHROME) {
  Config.setBrowserExecutable(process.env.REMOTION_CHROME);
}
