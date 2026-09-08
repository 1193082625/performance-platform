import { config } from "@vue/test-utils";
import { beforeEach } from "vitest";

import { i18n, LOCALE_STORAGE_KEY } from "./i18n.js";

config.global.plugins = [i18n];
config.global.directives = { frame: {} };

beforeEach(() => {
  i18n.global.locale.value = "en-US";
  window.localStorage.removeItem(LOCALE_STORAGE_KEY);
  document.documentElement.lang = "en-US";
});
