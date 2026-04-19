"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft,
  Shield,
  Smartphone,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Clock,
  LogOut,
  Monitor,
  Laptop,
  Loader2,
  Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { Separator } from '@/components/ui/separator';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

export default function SecurityPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [lastPasswordChange, setLastPasswordChange] = useState<string | null>(null);

  const [is2FADialogOpen, setIs2FADialogOpen] = useState(false);
  const [isDisable2FADialogOpen, setIsDisable2FADialogOpen] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaVerifying, setMfaVerifying] = useState(false);

  useEffect(() => {
    const fetchSecurityData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        setLastPasswordChange(user.updated_at || null);

        const { data: factors } = await supabase.auth.mfa.listFactors();
        const verifiedTotp = factors?.totp?.find(f => f.status === 'verified');
        setTwoFactorEnabled(!!verifiedTotp);
        if (verifiedTotp) {
          setMfaFactorId(verifiedTotp.id);
        }
        
        setSessions([
          { 
            id: '1', 
            device: 'Chrome on MacOS', 
            location: 'San Francisco, CA',
            lastActive: new Date().toISOString(),
            current: true,
            icon: Laptop
          },
          { 
            id: '2', 
            device: 'Safari on iPhone', 
            location: 'San Francisco, CA',
            lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            current: false,
            icon: Smartphone
          },
        ]);
      }
      setLoading(false);
    };

    fetchSecurityData();
  }, []);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      toast.success('Password changed successfully');
      setIsPasswordDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setLastPasswordChange(new Date().toISOString());
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    }
    setSaving(false);
  };

  const handleLogoutAllSessions = async () => {
    setSaving(true);
    try {
      await supabase.auth.signOut({ scope: 'global' });
      toast.success('Logged out of all sessions');
      window.location.href = '/login';
    } catch (error: any) {
      toast.error(error.message || 'Failed to log out');
    }
    setSaving(false);
  };

  const handleRevokeSession = async (sessionId: string) => {
    setSessions(sessions.filter(s => s.id !== sessionId));
    toast.success('Session revoked');
  };

  const handleEnable2FA = async () => {
    setMfaEnrolling(true);
    setMfaVerifyCode('');
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Store Authenticator',
      });
      if (error) throw error;

      setMfaFactorId(data.id);
      setMfaQrCode(data.totp.qr_code);
      setMfaSecret(data.totp.secret);
      setIs2FADialogOpen(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start 2FA setup');
    }
    setMfaEnrolling(false);
  };

  const handleVerify2FA = async () => {
    if (mfaVerifyCode.length !== 6) {
      toast.error('Enter a 6-digit code');
      return;
    }
    setMfaVerifying(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId,
        code: mfaVerifyCode,
      });
      if (error) throw error;

      setTwoFactorEnabled(true);
      setIs2FADialogOpen(false);
      setMfaVerifyCode('');
      toast.success('Two-factor authentication enabled');
    } catch (error: any) {
      toast.error(error.message || 'Invalid verification code');
    }
    setMfaVerifying(false);
  };

  const handleDisable2FA = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: mfaFactorId,
      });
      if (error) throw error;

      setTwoFactorEnabled(false);
      setMfaFactorId('');
      setIsDisable2FADialogOpen(false);
      toast.success('Two-factor authentication disabled');
    } catch (error: any) {
      toast.error(error.message || 'Failed to disable 2FA');
    }
    setSaving(false);
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength: 33, label: 'Weak', color: 'bg-red-500/100' };
    if (strength <= 3) return { strength: 66, label: 'Good', color: 'bg-amber-500/100' };
    return { strength: 100, label: 'Strong', color: 'bg-emerald-500/100' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return <MerchantPageSkeleton />;
  }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase font-bold tracking-[0.12em] bg-card border-border/70 text-muted-foreground/85 shadow-sm">Account</Badge>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">System Security</span>
            </div>
            <h2 className="text-[28px] font-semibold tracking-tight text-foreground">Security</h2>
            <p className="text-[15px] text-muted-foreground mt-1 max-w-2xl">Manage your account security, passwords, and active session clusters from a calm control surface.</p>
          </div>
        </div>
  
        <div className="space-y-6">
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                  <Key className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-[17px] font-semibold tracking-tight">Password</CardTitle>
                  <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Last changed: {formatDate(lastPasswordChange)}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-[20px] border border-border/70 shadow-sm">
                <div>
                  <p className="text-[15px] font-semibold text-foreground">Change your password</p>
                  <p className="text-[13px] text-muted-foreground mt-0.5">Use a strong password with at least 8 characters.</p>
                </div>
                <Button 
                  onClick={() => setIsPasswordDialogOpen(true)}
                  variant="outline"
                  className="h-10 px-5 text-[11px] font-bold uppercase tracking-[0.12em] border-border/70 bg-background hover:bg-secondary/40 rounded-[12px] transition-all shadow-sm"
                >
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
  
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                  <Smartphone className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-[17px] font-semibold tracking-tight">Two-Factor Authentication</CardTitle>
                  <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Add an extra layer of security to your account.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-[20px] border border-border/70 shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  {twoFactorEnabled ? (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-[15px] font-bold tracking-tight">Enabled</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground/60">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-[15px] font-bold tracking-tight">Not Enabled</span>
                    </div>
                  )}
                </div>
                {twoFactorEnabled ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-red-500 border-red-500/20 hover:bg-red-500/5 rounded-[10px]"
                    onClick={() => setIsDisable2FADialogOpen(true)}
                  >
                    Disable 2FA
                  </Button>
                ) : (
                  <Button
                    onClick={handleEnable2FA}
                    disabled={mfaEnrolling}
                    className="h-10 px-6 bg-foreground text-background hover:bg-foreground/90 text-[11px] font-bold uppercase tracking-[0.12em] rounded-[12px] shadow-md"
                  >
                    {mfaEnrolling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Enable 2FA
                  </Button>
                )}
              </div>
              {!twoFactorEnabled && (
                <div className="mt-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-[20px] flex items-start gap-3">
                  <Shield className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-[13px] leading-relaxed text-muted-foreground/85 font-medium">
                    Two-factor authentication adds an extra layer of security by requiring a verification code from your authenticator app when you sign in.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
  
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                    <Monitor className="w-4 h-4 text-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-[17px] font-semibold tracking-tight">Active Sessions</CardTitle>
                    <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Manage devices where you&apos;re currently logged in.</CardDescription>
                  </div>
                </div>
                <Button 
                  onClick={() => setIsLogoutDialogOpen(true)}
                  variant="outline"
                  className="h-9 px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-red-500 border-red-500/20 hover:bg-red-500/5 rounded-[10px]"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  Log Out All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/70">
                {sessions.map((session) => {
                  const SessionIcon = session.icon;
                  return (
                    <div key={session.id} className="flex items-center justify-between p-6 hover:bg-secondary/20 transition-colors">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-secondary/20 border border-border/70 flex items-center justify-center shadow-sm">
                          <SessionIcon className="w-6 h-6 text-muted-foreground/80" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="text-[15.5px] font-semibold text-foreground tracking-tight">{session.device}</p>
                            {session.current && (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-[0.12em]">Current</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5 mt-1">
                            <span className="text-[12.5px] font-medium text-muted-foreground/65">{session.location}</span>
                            <span className="text-muted-foreground/30">•</span>
                            <span className="text-[12.5px] font-medium text-muted-foreground/65 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {getTimeAgo(session.lastActive)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {!session.current && (
                        <Button
                          onClick={() => handleRevokeSession(session.id)}
                          variant="ghost"
                          size="sm"
                          className="h-9 px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground hover:text-red-500 hover:bg-red-500/5 rounded-[10px]"
                        >
                          Revoke Session
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
  
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                  <Shield className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <CardTitle className="text-[17px] font-semibold tracking-tight text-red-500">Account Lifecycle</CardTitle>
                  <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Signed in as {userEmail}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-[20px] border border-border/70">
                  <div>
                    <p className="text-[15px] font-semibold text-foreground">Email Address</p>
                    <p className="text-[13px] text-muted-foreground mt-0.5">{userEmail}</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-9 px-4 text-[11px] font-bold uppercase tracking-[0.12em] border-border/70 bg-background hover:bg-secondary/40 rounded-[10px]" disabled>
                    Change Email
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-[20px] border border-red-500/10">
                  <div>
                    <p className="text-[15px] font-semibold text-red-500">Delete Account</p>
                    <p className="text-[13px] text-red-400/70 mt-0.5">Permanently delete your account and all system data.</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-9 px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-red-500 border-red-500/20 hover:bg-red-500/5 rounded-[10px]" disabled>
                    Terminate Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
  
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="max-w-md bg-card border-border/70 p-0 overflow-hidden shadow-2xl rounded-[24px]">
            <DialogHeader className="p-6 border-b border-border/70 bg-secondary/30">
              <DialogTitle className="text-xl font-semibold tracking-tight">Change Password</DialogTitle>
              <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">
                Enter your new authentication credentials.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 p-6">
              <div className="space-y-2">
                <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Current Password</Label>
                <div className="relative group">
                  <Input 
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="h-11 bg-secondary/20 border-border/70 pr-12 text-[14.5px] font-medium rounded-[12px] px-4"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">New Password</Label>
                <div className="relative group">
                  <Input 
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="h-11 bg-secondary/20 border-border/70 pr-12 text-[14.5px] font-medium rounded-[12px] px-4"
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-secondary/20 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${passwordStrength.color} transition-all duration-500`}
                          style={{ width: `${passwordStrength.strength}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        passwordStrength.label === 'Weak' ? 'text-red-500' :
                        passwordStrength.label === 'Good' ? 'text-amber-500' : 'text-emerald-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <li className={`text-[10.5px] font-bold uppercase tracking-tighter flex items-center gap-1.5 ${newPassword.length >= 8 ? 'text-emerald-600' : 'text-muted-foreground/40'}`}>
                        {newPassword.length >= 8 ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current opacity-20" />} 8+ chars
                      </li>
                      <li className={`text-[10.5px] font-bold uppercase tracking-tighter flex items-center gap-1.5 ${/[A-Z]/.test(newPassword) ? 'text-emerald-600' : 'text-muted-foreground/40'}`}>
                        {/[A-Z]/.test(newPassword) ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current opacity-20" />} Upper case
                      </li>
                      <li className={`text-[10.5px] font-bold uppercase tracking-tighter flex items-center gap-1.5 ${/[0-9]/.test(newPassword) ? 'text-emerald-600' : 'text-muted-foreground/40'}`}>
                        {/[0-9]/.test(newPassword) ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current opacity-20" />} Number
                      </li>
                    </ul>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Confirm New Password</Label>
                <Input 
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="h-11 bg-secondary/20 border-border/70 text-[14.5px] font-medium rounded-[12px] px-4"
                  placeholder="Re-enter new password"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] font-bold text-red-500 uppercase tracking-tighter px-0.5">Passwords do not match</p>
                )}
              </div>
            </div>
            <DialogFooter className="p-6 pt-0 flex gap-3">
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} className="flex-1 h-11 border-border/70 font-bold uppercase tracking-[0.12em] text-[11px] hover:bg-secondary/40 transition-all rounded-[16px]">
                Cancel
              </Button>
              <Button 
                onClick={handleChangePassword} 
                disabled={saving || !newPassword || newPassword.length < 8 || newPassword !== confirmPassword}
                className="flex-1 h-11 bg-foreground text-background hover:bg-foreground/90 font-bold uppercase tracking-[0.12em] text-[11px] rounded-[16px] shadow-md"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Change Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Log out of all devices?</AlertDialogTitle>
              <AlertDialogDescription>
                This will log you out of all devices and sessions, including this one. You'll need to log in again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleLogoutAllSessions}
                className="bg-red-600 hover:bg-red-700"
              >
                Log out all
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={is2FADialogOpen} onOpenChange={setIs2FADialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[16px]">Set up two-factor authentication</DialogTitle>
              <DialogDescription className="text-[13px]">
                Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {mfaQrCode && (
                <div className="flex justify-center p-4 bg-white rounded-lg border border-border">
                  <img src={mfaQrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              )}
              {mfaSecret && (
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">Manual entry key</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-secondary/50 border border-border rounded text-[12px] font-mono text-foreground select-all break-all">
                      {mfaSecret}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[11px] shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(mfaSecret);
                        toast.success('Copied to clipboard');
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-[12px] font-medium">Verification code</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaVerifyCode}
                  onChange={e => setMfaVerifyCode(e.target.value.replace(/\D/g, ''))}
                  className="h-9 text-[13px] text-center tracking-[0.5em] font-mono"
                  placeholder="000000"
                  autoFocus
                />
                <p className="text-[10px] text-muted-foreground">Enter the 6-digit code from your authenticator app</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIs2FADialogOpen(false)} className="h-9 text-[13px]">
                Cancel
              </Button>
              <Button
                onClick={handleVerify2FA}
                disabled={mfaVerifying || mfaVerifyCode.length !== 6}
                className="h-9 text-[13px] bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {mfaVerifying ? 'Verifying...' : 'Verify & Enable'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDisable2FADialogOpen} onOpenChange={setIsDisable2FADialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disable two-factor authentication?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the extra layer of security from your account. You can re-enable it at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDisable2FA}
                className="bg-red-600 hover:bg-red-700"
                disabled={saving}
              >
                {saving ? 'Disabling...' : 'Disable 2FA'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }
