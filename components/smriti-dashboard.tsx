'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { MemorialProfile, MemorialMemory } from '@/lib/types';
import {
  fetchUserMemorials,
  saveMemorialProfile,
  deleteMemorialProfile,
  fetchMemoriesForMemorial,
  saveMemory,
  deleteMemory,
} from '@/lib/firestore-service';
import MemorialModal from './memorial-modal';
import MemoryModal from './memory-modal';
import LetterModal from './letter-modal';
import CompanionChat from './companion-chat';
import MemoriesManager from './memories-manager';
import {
  Plus,
  Heart,
  MessageSquare,
  BookOpen,
  Sparkles,
  LogOut,
  Trash2,
  Edit,
  Flame,
  ChevronRight,
  Scroll,
} from 'lucide-react';

export default function SmritiDashboard() {
  const { user, logOut } = useAuth();
  const [memorials, setMemorials] = useState<MemorialProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemorial, setSelectedMemorial] = useState<MemorialProfile | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'chat' | 'memories'>('dashboard');

  // Memories for currently selected memorial
  const [selectedMemories, setSelectedMemories] = useState<MemorialMemory[]>([]);

  // Modals state
  const [isMemorialModalOpen, setIsMemorialModalOpen] = useState(false);
  const [editingMemorial, setEditingMemorial] = useState<MemorialProfile | null>(null);

  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemorialMemory | null>(null);

  // Letter generation modal state
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [letterProfile, setLetterProfile] = useState<MemorialProfile | null>(null);
  const [letterMemories, setLetterMemories] = useState<MemorialMemory[]>([]);

  // Load user's memorials on mount or user change
  useEffect(() => {
    let active = true;
    if (!user) return;

    fetchUserMemorials(user.uid)
      .then((list) => {
        if (active) {
          setMemorials(list);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load memorials:', err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  // Load memories whenever selected memorial changes
  useEffect(() => {
    let active = true;
    if (!selectedMemorial || !user) return;

    fetchMemoriesForMemorial(user.uid, selectedMemorial.id)
      .then((mems) => {
        if (active) {
          setSelectedMemories(mems);
        }
      })
      .catch((err) => {
        console.error('Failed to load memories:', err);
      });

    return () => {
      active = false;
    };
  }, [selectedMemorial, user]);

  const refreshMemorials = async () => {
    if (!user) return;
    const list = await fetchUserMemorials(user.uid);
    setMemorials(list);
  };

  const refreshMemories = async (memorialId: string) => {
    if (!user) return;
    const mems = await fetchMemoriesForMemorial(user.uid, memorialId);
    setSelectedMemories(mems);
  };

  // Handlers for Memorials
  const handleSaveMemorial = async (
    data: Omit<MemorialProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    id?: string
  ) => {
    if (!user) return;
    const saved = await saveMemorialProfile(user.uid, data, id);
    await refreshMemorials();
    if (selectedMemorial && selectedMemorial.id === saved.id) {
      setSelectedMemorial(saved);
    }
  };

  const handleDeleteMemorial = async (memorialId: string) => {
    if (!user) return;
    if (confirm('Are you sure you want to delete this memorial profile and all related memories and conversations?')) {
      await deleteMemorialProfile(user.uid, memorialId);
      if (selectedMemorial?.id === memorialId) {
        setSelectedMemorial(null);
        setActiveView('dashboard');
      }
      await refreshMemorials();
    }
  };

  // Handlers for Memories
  const handleSaveMemory = async (
    data: {
      title: string;
      story: string;
      category: MemorialMemory['category'];
      timePeriod?: string;
      tags?: string[];
    },
    existingId?: string
  ) => {
    if (!user || !selectedMemorial) return;
    await saveMemory(user.uid, selectedMemorial.id, data, existingId);
    await refreshMemories(selectedMemorial.id);
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!user || !selectedMemorial) return;
    await deleteMemory(user.uid, selectedMemorial.id, memoryId);
    await refreshMemories(selectedMemorial.id);
  };

  // Switch to chat view
  const handleOpenChat = (memorial: MemorialProfile) => {
    setSelectedMemorial(memorial);
    setActiveView('chat');
  };

  // Switch to memories view
  const handleOpenMemories = (memorial: MemorialProfile) => {
    setSelectedMemorial(memorial);
    setActiveView('memories');
  };

  // Open letter generation modal
  const handleOpenLetter = async (memorial: MemorialProfile) => {
    setLetterProfile(memorial);
    if (selectedMemorial?.id === memorial.id && selectedMemories.length > 0) {
      setLetterMemories(selectedMemories);
    } else if (user) {
      try {
        const mems = await fetchMemoriesForMemorial(user.uid, memorial.id);
        setLetterMemories(mems);
      } catch (e) {
        console.warn('Could not prefetch memories for letter modal:', e);
        setLetterMemories([]);
      }
    }
    setIsLetterModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#4A443F] flex flex-col selection:bg-[#7D8F69]/20 selection:text-[#4A443F] font-sans">
      {/* Top Navigation */}
      <header className="border-b border-[#E5E0D5] bg-[#F5F1E9]/90 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#7D8F69]/10 border border-[#7D8F69]/30 flex items-center justify-center text-[#7D8F69] group-hover:scale-105 transition-transform">
              <Flame className="w-4 h-4 fill-[#7D8F69]/30" />
            </div>
            <div>
              <span className="text-xl font-serif font-bold tracking-tight text-[#7D8F69]">Smriti</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#7D8F69] ml-1.5 px-2 py-0.5 rounded-full bg-[#7D8F69]/10 border border-[#7D8F69]/20">
                Memorial
              </span>
            </div>
          </div>

          {selectedMemorial && activeView !== 'dashboard' && (
            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-[#E5E0D5] text-xs text-[#8C7B6E]">
              <span
                onClick={() => setActiveView('dashboard')}
                className="hover:text-[#4A443F] cursor-pointer"
              >
                Dashboard
              </span>
              <ChevronRight className="w-3 h-3 text-[#A69F95]" />
              <span className="text-[#7D8F69] font-serif font-semibold">{selectedMemorial.name}</span>
            </div>
          )}
        </div>

        {/* User profile & Actions */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-semibold text-[#4A443F]">
                  {user.displayName || 'Authenticated User'}
                </span>
                <span className="text-[11px] text-[#A69F95]">{user.email}</span>
              </div>

              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Avatar'}
                  className="w-8 h-8 rounded-full border border-[#E5E0D5] object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#8C7B6E] border border-[#E5E0D5] flex items-center justify-center text-xs font-medium text-white">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}

              <button
                id="sign-out-btn"
                onClick={logOut}
                className="p-2 rounded-xl text-[#8C7B6E] hover:text-[#4A443F] hover:bg-[#E5E0D5]/50 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {activeView === 'dashboard' && (
          <div className="space-y-8">
            {/* Hero / Welcome Banner */}
            <div className="p-8 md:p-10 rounded-3xl bg-linear-to-b from-[#F5F1E9] via-[#FAF8F5] to-[#FDFBF7] border border-[#E5E0D5] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7D8F69]/10 border border-[#7D8F69]/20 text-[#7D8F69] text-xs font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  Personal Memorial Sanctuary
                </div>
                <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-[#4A443F]">
                  Preserve, Cherish, and Converse
                </h1>
                <p className="text-sm text-[#8C7B6E] leading-relaxed">
                  Record stories, anecdotes, and quotes of those who touched your life. Smriti transforms them into vector embeddings to power an authentic, memory-grounded AI companion.
                </p>
              </div>

              <button
                id="create-memorial-btn"
                onClick={() => {
                  setEditingMemorial(null);
                  setIsMemorialModalOpen(true);
                }}
                className="px-6 py-3.5 rounded-full bg-[#7D8F69] hover:bg-[#6E7E5B] text-white text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-[#7D8F69]/20 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Create Memorial Profile
              </button>
            </div>

            {/* Memorial Profiles List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-serif font-bold text-[#4A443F]">Your Memorial Companions</h2>
                <span className="text-xs text-[#A69F95] font-medium">
                  {memorials.length} {memorials.length === 1 ? 'Profile' : 'Profiles'}
                </span>
              </div>

              {loading ? (
                <div className="p-12 text-center text-[#8C7B6E]">
                  <div className="inline-block animate-spin w-6 h-6 border-2 border-[#7D8F69] border-t-transparent rounded-full mb-2" />
                  <p className="text-xs">Loading memorial profiles from Firestore...</p>
                </div>
              ) : memorials.length === 0 ? (
                <div className="p-12 rounded-3xl bg-white border border-dashed border-[#E5E0D5] text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#F5F1E9] border border-[#E5E0D5] flex items-center justify-center mx-auto text-[#7D8F69]">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h3 className="text-base font-serif font-bold text-[#4A443F]">
                      No Memorial Profiles Created Yet
                    </h3>
                    <p className="text-xs text-[#8C7B6E]">
                      Create a profile for a parent, grandparent, mentor, or friend to begin recording their stories and building a reflective companion.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingMemorial(null);
                      setIsMemorialModalOpen(true);
                    }}
                    className="mt-2 px-5 py-2.5 rounded-full bg-[#7D8F69] hover:bg-[#6E7E5B] text-white font-medium text-xs inline-flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Memorial
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {memorials.map((profile) => (
                    <div
                      key={profile.id}
                      className="p-6 rounded-3xl bg-white border border-[#E5E0D5] hover:border-[#7D8F69]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-6 shadow-xs group"
                    >
                      <div className="space-y-4">
                        {/* Profile Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            <div className="w-14 h-14 rounded-2xl bg-[#F5F1E9] border border-[#E5E0D5] flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                              {profile.avatarType === 'emoji' ? (
                                <span className="text-3xl">{profile.avatarValue}</span>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={profile.avatarValue}
                                  alt={profile.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div>
                              <h3 className="text-lg font-serif font-bold text-[#4A443F] tracking-tight">
                                {profile.name}
                              </h3>
                              <span className="inline-block text-xs font-medium text-[#7D8F69] mt-0.5">
                                {profile.relationship}
                              </span>
                              {(profile.birthYear || profile.passedYear) && (
                                <p className="text-[11px] text-[#A69F95]">
                                  {profile.birthYear || '?'} &ndash; {profile.passedYear || 'Present'}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingMemorial(profile);
                                setIsMemorialModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-[#8C7B6E] hover:text-[#4A443F] hover:bg-[#F5F1E9] transition-colors cursor-pointer"
                              title="Edit Profile"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMemorial(profile.id)}
                              className="p-1.5 rounded-lg text-[#8C7B6E] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Profile"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Traits */}
                        {profile.personalityTraits && profile.personalityTraits.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {profile.personalityTraits.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-0.5 rounded-md bg-[#F0EBE0] text-[11px] text-[#8C7B6E] border border-[#E5E0D5]"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Life Snippet or Tone */}
                        {profile.bioSnippet && (
                          <p className="text-xs text-[#8C7B6E] italic line-clamp-2 leading-relaxed">
                            &ldquo;{profile.bioSnippet}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-3 border-t border-[#E5E0D5]">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleOpenMemories(profile)}
                            className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#F5F1E9] text-[#4A443F] text-xs font-medium border border-[#E5E0D5] flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-[#7D8F69]" />
                            Memories
                          </button>
                          <button
                            onClick={() => handleOpenChat(profile)}
                            className="py-2.5 px-3 rounded-xl bg-[#7D8F69] hover:bg-[#6E7E5B] text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Converse
                          </button>
                        </div>
                        <button
                          id={`generate-letter-btn-${profile.id}`}
                          onClick={() => handleOpenLetter(profile)}
                          className="w-full py-2 px-3 rounded-xl bg-[#F0EBE0] hover:bg-[#E5E0D5] text-[#4A443F] text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-[#E5E0D5]"
                        >
                          <Scroll className="w-3.5 h-3.5 text-[#7D8F69]" />
                          Generate a Letter
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Companion Chat View */}
        {activeView === 'chat' && selectedMemorial && (
          <CompanionChat
            userId={user!.uid}
            profile={selectedMemorial}
            memories={selectedMemories}
            onBack={() => setActiveView('dashboard')}
            onOpenMemoryTab={() => setActiveView('memories')}
            onEditProfileClick={(prof) => {
              setEditingMemorial(prof);
              setIsMemorialModalOpen(true);
            }}
            onGenerateLetterClick={() => handleOpenLetter(selectedMemorial)}
            onMemoryAdded={() => refreshMemories(selectedMemorial.id)}
          />
        )}

        {/* Memories Manager View */}
        {activeView === 'memories' && selectedMemorial && (
          <MemoriesManager
            userId={user!.uid}
            profile={selectedMemorial}
            memories={selectedMemories}
            onAddMemoryClick={() => {
              setEditingMemory(null);
              setIsMemoryModalOpen(true);
            }}
            onEditMemoryClick={(mem) => {
              setEditingMemory(mem);
              setIsMemoryModalOpen(true);
            }}
            onEditProfileClick={(prof) => {
              setEditingMemorial(prof);
              setIsMemorialModalOpen(true);
            }}
            onGenerateLetterClick={() => handleOpenLetter(selectedMemorial)}
            onDeleteMemory={handleDeleteMemory}
            onOpenChat={() => setActiveView('chat')}
            onBackToDashboard={() => setActiveView('dashboard')}
          />
        )}
      </main>

      {/* Memorial Edit/Create Modal */}
      <MemorialModal
        isOpen={isMemorialModalOpen}
        onClose={() => {
          setIsMemorialModalOpen(false);
          setEditingMemorial(null);
        }}
        onSave={handleSaveMemorial}
        initialData={editingMemorial}
        companion={editingMemorial}
      />

      {/* Memory Edit/Create Modal */}
      {selectedMemorial && (
        <MemoryModal
          isOpen={isMemoryModalOpen}
          onClose={() => {
            setIsMemoryModalOpen(false);
            setEditingMemory(null);
          }}
          onSave={handleSaveMemory}
          initialData={editingMemory}
          selectedMemory={editingMemory}
          memorialName={selectedMemorial.name}
        />
      )}

      {/* Letter From Them Modal */}
      <LetterModal
        isOpen={isLetterModalOpen}
        onClose={() => {
          setIsLetterModalOpen(false);
          setLetterProfile(null);
        }}
        profile={letterProfile || selectedMemorial}
        memories={letterMemories.length > 0 ? letterMemories : selectedMemories}
      />
    </div>
  );
}
