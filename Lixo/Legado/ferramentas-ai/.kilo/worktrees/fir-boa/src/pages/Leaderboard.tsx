import { useState } from "react";
import { Trophy, Medal, Crown, Flame, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

import React from "react";

type LeaderboardRow = {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  total_xp: number;
  level: number;
  current_streak: number;
};

class LocalErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-500 bg-red-100 rounded-lg m-8">
          <h2 className="font-bold text-lg mb-2">Render Error in Leaderboard</h2>
          <pre className="text-xs overflow-auto">{this.state.error?.message}</pre>
          <pre className="text-xs mt-4">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const Leaderboard = () => {
  const { user } = useAuth();
  
  const { data: rankings, isLoading, error } = useQuery({
    queryKey: ["global-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_global_leaderboard");

      if (error) {
        console.error("Supabase Error on view_global_leaderboard:", error);
        throw error;
      }
      return data as LeaderboardRow[];
    },
  });

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const TopPodiumCard = ({ userRow, position }: { userRow: LeaderboardRow, position: 1 | 2 | 3 }) => {
    const isFirst = position === 1;
    const isSecond = position === 2;
    const isThird = position === 3;
    
    return (
      <div className={`relative flex flex-col items-center p-6 rounded-2xl border bg-card/40 backdrop-blur-md 
        ${isFirst ? 'border-amber-500/50 shadow-[0_0_30px_-10px_rgba(245,158,11,0.5)] md:-mt-8 z-10' : 
          isSecond ? 'border-zinc-300/40 shadow-lg' : 
          'border-amber-700/40 shadow-lg'}
      `}>
        {isFirst && (
          <Crown className="absolute -top-6 text-amber-500 w-10 h-10 drop-shadow-md animate-pulse" />
        )}
        
        <div className="relative mb-4">
          <Avatar className={`${isFirst ? 'w-24 h-24' : 'w-20 h-20'} ring-4 ${
            isFirst ? 'ring-amber-500' : isSecond ? 'ring-zinc-300' : 'ring-amber-700'
          } shadow-xl`}>
            <AvatarImage src={userRow.avatar_url || ""} />
            <AvatarFallback className="text-2xl font-bold bg-muted text-foreground">
              {getInitials(userRow.user_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className={`absolute -bottom-3 -right-2 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border-2 border-background
            ${isFirst ? 'bg-amber-500 text-amber-950' : 
              isSecond ? 'bg-zinc-300 text-zinc-900' : 
              'bg-amber-700 text-amber-50'}
          `}>
            #{position}
          </div>
        </div>
        
        <h3 className={`font-bold text-center truncate w-full max-w-[150px] ${isFirst ? 'text-lg' : 'text-base'}`}>
          {userRow.user_name || "Membro Oculto"}
        </h3>
        
        <div className="mt-3 flex items-center gap-3">
          <div className="bg-primary/10 px-3 py-1 rounded-full flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">Nível {userRow.level}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center gap-1">
          <span className="text-2xl font-black tracking-tighter text-foreground">
            {Number(userRow.total_xp || 0).toLocaleString()} <span className="text-sm font-semibold text-muted-foreground">XP</span>
          </span>
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="w-3 h-3" />
            <span className="text-xs font-bold">{userRow.current_streak} dias seq.</span>
          </div>
        </div>
      </div>
    );
  };

  const podiumData = rankings?.slice(0, 3) || [];
  const listData = rankings?.slice(3) || [];
  
  // Find current user position if not in top 20
  const currentUserIndex = rankings?.findIndex(r => r.user_id === user?.id) ?? -1;
  const isCurrentUserInList = currentUserIndex >= 0;

  if (error) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex flex-col justify-center items-center h-64 border border-destructive/20 rounded-xl bg-destructive/10 mt-8">
        <h2 className="text-xl font-bold text-destructive mb-2">Erro ao carregar o ranking</h2>
        <p className="font-mono text-xs text-muted-foreground bg-black/40 p-2 rounded w-full overflow-auto">
          {error instanceof Error ? error.message : JSON.stringify(error)}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="h-20 bg-card rounded-lg w-full max-w-sm mb-12"></div>
        <div className="flex flex-col md:flex-row justify-center items-end gap-6 mb-16">
          <div className="h-64 bg-card rounded-2xl w-full md:w-64"></div>
          <div className="h-80 bg-card rounded-2xl w-full md:w-72"></div>
          <div className="h-56 bg-card rounded-2xl w-full md:w-64"></div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-card rounded-xl w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-8 px-4 md:px-8 max-w-5xl mx-auto mt-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Medal className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Ranking Global</h1>
          </div>
          <p className="text-muted-foreground mt-2 ml-14">
            Compare seu progresso e mantenha sua ofensiva alta para subir na classificação.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 mt-4">
        {/* Podium Section */}
        {podiumData.length > 0 && (
          <div className="flex flex-col md:flex-row justify-center items-end gap-6 mb-16 px-4 pt-10">
            {podiumData[1] && <div className="order-2 md:order-1 w-full md:w-64"><TopPodiumCard userRow={podiumData[1]} position={2} /></div>}
            {podiumData[0] && <div className="order-1 md:order-2 w-full md:w-72"><TopPodiumCard userRow={podiumData[0]} position={1} /></div>}
            {podiumData[2] && <div className="order-3 md:order-3 w-full md:w-64"><TopPodiumCard userRow={podiumData[2]} position={3} /></div>}
          </div>
        )}

        {/* List Section */}
        <div className="bg-card/30 border rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="grid grid-cols-12 gap-4 p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b bg-muted/20">
            <div className="col-span-2 md:col-span-1 text-center">Pos</div>
            <div className="col-span-6 md:col-span-4">Aluno</div>
            <div className="col-span-4 md:col-span-3 text-center">Nível</div>
            <div className="hidden md:flex col-span-2 justify-center">Ofensiva</div>
            <div className="col-span-4 md:col-span-2 text-right pr-4">Total XP</div>
          </div>

          <div className="divide-y border-t-0">
            {listData.map((row, index) => {
              const position = index + 4;
              const isCurrentUser = row.user_id === user?.id;

              return (
                <div 
                  key={row.user_id} 
                  className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors hover:bg-card/80 ${
                    isCurrentUser ? "bg-primary/5 border-l-2 border-l-primary" : ""
                  }`}
                >
                  <div className="col-span-2 md:col-span-1 text-center font-mono font-bold text-muted-foreground">
                    {position}
                  </div>
                  
                  <div className="col-span-6 md:col-span-4 flex items-center gap-3 overflow-hidden">
                    <Avatar className="w-10 h-10 border border-white/10 shrink-0">
                      <AvatarImage src={row.avatar_url || ""} />
                      <AvatarFallback>{getInitials(row.user_name)}</AvatarFallback>
                    </Avatar>
                    <div className="truncate font-medium text-sm">
                      {row.user_name || "Membro Oculto"}
                      {isCurrentUser && <span className="ml-2 text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full uppercase">Você</span>}
                    </div>
                  </div>
                  
                  <div className="col-span-4 md:col-span-3 flex justify-center text-sm font-semibold text-primary">
                    Lvl {row.level}
                  </div>
                  
                  <div className="hidden md:flex col-span-2 justify-center items-center gap-1.5 text-xs font-medium text-orange-500">
                    <Flame className="w-3.5 h-3.5" />
                    {row.current_streak || 0}
                  </div>
                  
                  <div className="col-span-4 md:col-span-2 text-right pr-4 font-mono font-bold">
                    {Number(row.total_xp || 0).toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">XP</span>
                  </div>
                </div>
              );
            })}
            
            {listData.length === 0 && podiumData.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                O ranking está vazio no momento.
              </div>
            )}
          </div>
        </div>

        {/* Current User Fixed Status if not in list - Optional enhancement */}
        {user && !isCurrentUserInList && rankings && rankings.length >= 20 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-card border shadow-2xl rounded-2xl p-4 flex items-center justify-between z-50">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 ring-2 ring-primary border-background">
                <AvatarFallback>VO</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">Você</p>
                <p className="text-xs text-muted-foreground">Continue estudando para entrar no Top 20!</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-mono font-bold text-primary">20+</span>
              <span className="text-[10px] text-muted-foreground uppercase">Posição</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function LeaderboardWithBoundary() {
  return (
    <LocalErrorBoundary>
      <Leaderboard />
    </LocalErrorBoundary>
  );
}
