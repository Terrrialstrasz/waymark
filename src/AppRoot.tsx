import { StatusBar } from "expo-status-bar";
import { WaymarkAppProvider } from "./app";
import { WaymarkShellApp } from "./screens/WaymarkShellApp";

export default function AppRoot() {
  return (
    <>
      <StatusBar style="dark" />
      <WaymarkAppProvider>
        <WaymarkShellApp />
      </WaymarkAppProvider>
    </>
  );
}
