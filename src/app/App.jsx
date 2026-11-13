import { BrowserRouter } from 'react-router';
import ToastProvider from '@shared/components/ui/ToastProvider.jsx';
import StartupGate from '@app/startup/StartupGate.jsx';
import UpdatePrompt from '@app/update/UpdatePrompt.jsx';
import AnimatedRoutes from '@app/router/AnimatedRoutes.jsx';

// As in Ahorra. StartupGate mounts everything inside it only after it has written the launch decision to the address,
// so BrowserRouter reads the right address when it mounts.
export default function App() {
  return (
    <StartupGate>
      <ToastProvider>
        <BrowserRouter>
          <AnimatedRoutes />
          <UpdatePrompt />
        </BrowserRouter>
      </ToastProvider>
    </StartupGate>
  );
}
