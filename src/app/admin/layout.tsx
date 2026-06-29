import { RemoteScannerProvider } from '@/lib/remote-scanner-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RemoteScannerProvider>{children}</RemoteScannerProvider>;
}
