// Vitest setup for the web project: unmount what each test rendered.
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);
