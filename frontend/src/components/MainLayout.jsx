import Header from './Header';
import Footer from './Footer';

/**
 * MainLayout provides the overall page structure with TikTok-inspired grid layout.
 * Desktop: 60% mapping, 40% live feed side by side
 * Tablet/Mobile: Stacked layout for better usability
 */
export default function MainLayout({ 
  children, 
  connectionStatus, 
  connectedUsername, 
  connectionError, 
  isLive,
  onConnectionChange 
}) {
  return (
    <div className="min-h-screen bg-tiktok-black font-tiktok flex flex-col">
      {/* Header with TikTok branding */}
      <Header 
        connectionStatus={connectionStatus}
        connectedUsername={connectedUsername}
        connectionError={connectionError}
        isLive={isLive}
        onConnectionChange={onConnectionChange}
      />
      
      {/* Main content area with responsive grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-0">
        {children}
      </main>
      
      {/* Minimal footer */}
      <Footer />
    </div>
  );
}
