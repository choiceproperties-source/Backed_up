import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Menu, LogOut, User as UserIcon, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { FavoritesDropdown } from "@/components/favorites-dropdown";
import { NotificationBell } from "@/components/notification-bell";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isLoggedIn } = useAuth();

  const isAdmin = user?.email === 'admin@choiceproperties.com';
  const isLoggedInUser = user && user.email !== 'admin@choiceproperties.com';

  const links = [
    { href: "/", label: "Home" },
    { href: "/properties", label: "Rent" },
    { href: "/faq", label: "FAQ" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
    ...(isLoggedInUser ? [
      { href: "/renter-dashboard", label: "Renter" },
      { href: "/landlord-dashboard", label: "Landlord" }
    ] : []),
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
  ];

  const isActive = (path: string) => location === path;

  const handleKeyDown = useCallback((e: React.KeyboardEvent, href: string, callback?: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback?.();
    }
  }, []);

  return (
    <nav 
      className="sticky top-0 z-50 w-full border-b bg-white/95 dark:bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-950/60" 
      aria-label="Main navigation"
      role="navigation"
    >
      <div className="container flex h-16 items-center justify-between mx-auto px-4">
        <Link href="/">
          <span 
            className="flex items-center space-x-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md" 
            aria-label="Choice Properties home"
            tabIndex={0}
            data-testid="link-home-logo"
          >
            <span className="font-heading text-2xl font-bold text-primary">
              Choice<span className="text-secondary">Properties</span>
            </span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center space-x-4 xl:space-x-6" role="menubar" aria-label="Main menu">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              <span
                className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2 py-1 ${
                  isActive(link.href) ? "text-primary font-bold" : "text-muted-foreground"
                }`}
                role="menuitem"
                tabIndex={0}
                aria-current={isActive(link.href) ? "page" : undefined}
                data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {link.label}
              </span>
            </Link>
          ))}
          <FavoritesDropdown />
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <Link href="/messages">
                <Button variant="ghost" size="icon" aria-label="Messages" data-testid="button-messages-desktop">
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </Link>
              <NotificationBell />
              <span className="text-sm text-muted-foreground" data-testid="text-user-name">{user?.full_name || user?.email}</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={logout}
                className="flex items-center gap-1"
                aria-label="Logout from account"
                data-testid="button-logout-desktop"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" /> Logout
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" data-testid="button-login-desktop">Login</Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-secondary hover:bg-secondary/90 text-primary-foreground font-bold" data-testid="button-signup-desktop">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Nav */}
        <div className="lg:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                aria-label="Open navigation menu"
                aria-expanded={isOpen}
                aria-controls="mobile-menu"
                data-testid="button-menu-toggle"
              >
                <Menu className="h-6 w-6" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="right" 
              className="w-72 sm:w-80 overflow-y-auto max-h-screen scroll-smooth"
              id="mobile-menu"
              aria-label="Mobile navigation menu"
            >
              <div className="flex justify-between items-center mb-4">
                <span className="font-heading text-xl font-bold text-primary">
                  Choice<span className="text-secondary">Properties</span>
                </span>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" aria-label="Close menu" data-testid="button-close-menu">
                    <X className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </SheetClose>
              </div>
              <nav className="flex flex-col space-y-1" role="navigation" aria-label="Mobile navigation">
                <p className="text-xs font-semibold text-muted-foreground px-4 py-2 uppercase tracking-wider">Navigation</p>
                <div className="max-h-[50vh] overflow-y-auto scroll-smooth">
                  {links.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <span
                        onClick={() => setIsOpen(false)}
                        onKeyDown={(e) => handleKeyDown(e, link.href, () => setIsOpen(false))}
                        className={`px-4 py-3 text-base font-medium transition-colors rounded-lg block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          isActive(link.href) ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-muted"
                        }`}
                        tabIndex={0}
                        role="menuitem"
                        aria-current={isActive(link.href) ? "page" : undefined}
                        data-testid={`mobile-nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {link.label}
                      </span>
                    </Link>
                  ))}
                </div>
                <div className="border-t border-border my-2" role="separator"></div>
                <p className="text-xs font-semibold text-muted-foreground px-4 py-2 uppercase tracking-wider">Account</p>
                {isLoggedIn ? (
                  <>
                    <div className="px-4 py-3 text-base font-medium text-foreground flex items-center" data-testid="text-mobile-user">
                      <UserIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                      {user?.full_name || user?.email}
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
                      className="px-4 py-3 text-base font-medium text-muted-foreground hover:bg-muted rounded-lg w-full text-left flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Logout from account"
                      data-testid="button-logout-mobile"
                    >
                      <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <span
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-3 text-base font-medium text-muted-foreground hover:bg-muted rounded-lg block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        tabIndex={0}
                        data-testid="link-login-mobile"
                      >
                        Login
                      </span>
                    </Link>
                    <div className="px-4 mt-2">
                      <Link href="/signup">
                        <Button 
                          className="w-full bg-secondary hover:bg-secondary/90 text-primary-foreground font-bold"
                          onClick={() => setIsOpen(false)}
                          data-testid="button-signup-mobile"
                        >
                          Sign Up
                        </Button>
                      </Link>
                    </div>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
