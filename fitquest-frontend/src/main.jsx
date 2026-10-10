import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowDownRight, ArrowRight, Award, Bike, Camera, Check, ChevronDown, CircleHelp, Clock3, Copy, Download, ExternalLink, FileText, Flame, Footprints, Gauge, Image, Leaf, Menu, MessageCircle, MessageSquare, Mountain, Plus, RefreshCw, Send, Share2, Sparkles, Target, Trash2, Trophy, WandSparkles, Waves, X, Zap } from 'lucide-react';
import './style.css';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const icons = {walking:Footprints,running:Activity,cycling:Bike,hiking:Mountain};
const emoji = {walking:'🚶',running:'🏃',cycling:'🚴',hiking:'🥾'};
const pretty = s => (s || '').replaceAll('_',' ').replace(/^./, c=>c.toUpperCase());
const dateLabel = d => new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'});

function roundRect(ctx, x, y, width, height, radius) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  if (!text) return;
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

function compressPhoto(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new window.Image();
    img.onload = () => {
      const maxDim = 800;
      let width = img.width, height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function downloadStoryCard(data) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1050;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderCard = (userImg = null) => {
      const bgGrad = ctx.createLinearGradient(0, 0, 800, 1050);
      bgGrad.addColorStop(0, '#15291c');
      bgGrad.addColorStop(0.5, '#244c33');
      bgGrad.addColorStop(1, '#346547');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 800, 1050);

      const glow = ctx.createRadialGradient(680, 120, 10, 680, 120, 320);
      glow.addColorStop(0, 'rgba(233, 162, 118, 0.45)');
      glow.addColorStop(1, 'rgba(233, 162, 118, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(680, 120, 320, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      roundRect(ctx, 60, 50, 680, 940, 28);
      ctx.fill();
      ctx.stroke();

      ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('🌱 FITQUEST', 100, 105);

      ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#a8cfb4';
      ctx.fillText((data.card_type || 'MOMENT').toUpperCase(), 100, 135);

      let curY = 210;
      if (userImg) {
        ctx.save();
        roundRect(ctx, 100, 160, 600, 240, 18);
        ctx.clip();
        ctx.drawImage(userImg, 100, 160, 600, 240);
        ctx.restore();
        curY = 445;
      } else {
        ctx.font = '72px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(data.badge || '✨', 100, 240);
        curY = 300;
      }

      ctx.font = '800 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffffff';
      wrapText(ctx, data.title, 100, curY, 590, 42);

      ctx.font = '400 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#d4e7db';
      wrapText(ctx, data.subtitle, 100, curY + 62, 590, 26);

      const statKeys = Object.entries(data.stats || {}).slice(0, 4);
      const boxWidth = 280;
      const boxHeight = 82;
      statKeys.forEach(([k, v], i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 100 + col * 320;
        const y = (curY + 115) + row * 95;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 1.5;
        roundRect(ctx, x, y, boxWidth, boxHeight, 14);
        ctx.fill();
        ctx.stroke();

        ctx.font = '800 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#ffd8a8';
        ctx.fillText(String(v), x + 18, y + 40);

        ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#b7d4c0';
        ctx.fillText(k.replace(/_/g, ' ').toUpperCase(), x + 18, y + 64);
      });

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(100, 920);
      ctx.lineTo(700, 920);
      ctx.stroke();

      ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#a8cfb4';
      ctx.fillText('Every step counts · Outdoor Fitness Habit', 100, 952);

      ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#7fa88c';
      ctx.fillText(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 580, 952);

      const link = document.createElement('a');
      link.download = `fitquest-${(data.card_type || 'card')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    if (data.photo_url) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => renderCard(img);
      img.onerror = () => renderCard(null);
      img.src = data.photo_url;
    } else {
      renderCard(null);
    }
  } catch (err) {
    console.error('Failed to generate image:', err);
  }
}

function ShareModal({ data, onClose, onToast }) {
  const [copied, setCopied] = useState(false);
  const fullText = `${data.message}\n\n${(data.hashtags || ['FitQuest', 'FitnessJourney']).map(t => `#${t}`).join(' ')}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      onToast('Share text copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onToast('Could not copy automatically. Select text manually.');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: data.title, text: fullText });
        onToast('Shared successfully!');
      } catch (err) {
        if (err.name !== 'AbortError') handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <div className="modal-heading">
          <div>
            <div className="section-kicker">SHARE YOUR WIN</div>
            <h2 id="share-title">Inspire your circle</h2>
            <p>Celebrate your momentum with friends and on social media.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </div>

        <div className="share-card-canvas-wrap">
          <div className="share-card-header">
            <div className="share-card-brand">
              <Leaf size={16} /> FITQUEST
            </div>
            <span>{data.card_type}</span>
          </div>

          {data.photo_url ? (
            <img src={data.photo_url} alt="Trail capture" className="share-card-photo" onError={e=>{e.currentTarget.style.display='none'}} />
          ) : (
            <div className="share-card-badge">{data.badge || '🏆'}</div>
          )}

          <h3 className="share-card-title">{data.title}</h3>
          <p className="share-card-subtitle">{data.subtitle}</p>

          {data.stats && (
            <div className="share-stats-chips">
              {Object.entries(data.stats).slice(0, 4).map(([k, v]) => (
                <div className="share-stat-chip" key={k}>
                  <span>{k.replace(/_/g, ' ')}:</span> <strong>{String(v)}</strong>
                </div>
              ))}
            </div>
          )}

          <div className="share-card-footer">
            <span>Every step counts 🌿</span>
            <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>

        <div className="share-actions-grid">
          <button className="share-channel-btn btn-native" onClick={handleNativeShare}>
            <Share2 size={16} /> Share via Device
          </button>
          <button className="share-channel-btn btn-whatsapp" onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`, '_blank', 'noopener,noreferrer')}>
            <MessageCircle size={16} /> WhatsApp
          </button>
          <button className="share-channel-btn btn-twitter" onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`, '_blank', 'noopener,noreferrer')}>
            <ExternalLink size={16} /> Post on 𝕏
          </button>
          <button className="share-channel-btn btn-download" onClick={() => { downloadStoryCard(data); onToast('Story card downloaded!'); }}>
            <Download size={16} /> Save Card Image
          </button>
        </div>

        <div className="share-text-preview">
          <button className="share-text-copy-btn" onClick={handleCopy} title="Copy share text">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          {fullText}
        </div>

        <div className="modal-actions">
          <button type="button" className="outline-btn" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}

function App(){
 const [page,setPage]=useState('Overview'), [dashboard,setDashboard]=useState(null), [quests,setQuests]=useState([]), [workouts,setWorkouts]=useState([]), [achievements,setAchievements]=useState([]), [review,setReview]=useState(null), [toast,setToast]=useState(''), [error,setError]=useState(''), [loading,setLoading]=useState(true), [mobileNav,setMobileNav]=useState(false), [showWorkout,setShowWorkout]=useState(false), [generating,setGenerating]=useState(false), [coachBusy,setCoachBusy]=useState(false), [goal,setGoal]=useState('Build a consistent outdoor fitness habit'), [level,setLevel]=useState('beginner'), [count,setCount]=useState('3'), [focus,setFocus]=useState('Improve consistency and outdoor fitness'), [search,setSearch]=useState(''), [shareData,setShareData]=useState(null), [activePhoto,setActivePhoto]=useState(null);
 const [form,setForm]=useState({activity_type:'walking',duration_minutes:'30',distance_km:'',perceived_effort:'5',notes:'',photo_url:null});
 const [coachTab,setCoachTab]=useState('chat'), [chatMessages,setChatMessages]=useState([]), [chatInput,setChatInput]=useState(''), [chatLoading,setChatLoading]=useState(false);
 const chatBottomRef = useRef(null);

 const request=useCallback(async(path,options={})=>{const r=await fetch(`${API}${path}`,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.detail||`Request failed (${r.status})`);return data;},[]);
 
 const refresh=useCallback(async()=>{setError('');try{const results=await Promise.allSettled([request('/api/v1/dashboard'),request('/api/v1/quests'),request('/api/v1/workouts?limit=50'),request('/api/v1/achievements'),request('/api/v1/coach/reviews/latest'),request('/api/v1/coach/chat')]);if(results[0].status==='fulfilled')setDashboard(results[0].value);else throw results[0].reason;if(results[1].status==='fulfilled')setQuests(results[1].value);if(results[2].status==='fulfilled')setWorkouts(results[2].value);if(results[3].status==='fulfilled')setAchievements(results[3].value);if(results[4].status==='fulfilled')setReview(results[4].value);else setReview(null);if(results[5].status==='fulfilled')setChatMessages(results[5].value||[]);else setChatMessages([]);}catch(e){setError(`${e.message}. Make sure your FastAPI backend is running at ${API}.`)}finally{setLoading(false)}},[request]);
 
 useEffect(()=>{refresh()},[refresh]); 
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),3200);return()=>clearTimeout(t)},[toast]);
 useEffect(()=>{chatBottomRef.current?.scrollIntoView({behavior:'smooth'});},[chatMessages,chatLoading]);

 const nav=[['Overview',Gauge],['Discover quests',Target],['My activity',Activity],['Achievements',Trophy],['AI coach',Sparkles]];
 const navigate=n=>{setPage(n);setMobileNav(false);setError('')};

 async function openShareProgress() {
   try {
     const data = await request('/api/v1/share/progress');
     setShareData({ ...data, badge: '🌱' });
   } catch {
     const lvl = dashboard?.level || 1;
     const xp = dashboard?.total_xp || 0;
     const streak = dashboard?.current_streak || 0;
     setShareData({
       card_type: 'progress',
       title: `Level ${lvl} Explorer`,
       subtitle: `${xp} XP · ${streak}-Day Streak`,
       badge: '🌱',
       message: `🌱 Just checked in on FitQuest! I'm a Level ${lvl} Explorer with ${xp} XP and a ${streak}-day active streak. Total outdoor time: ${Math.floor((dashboard?.total_minutes||0)/60)}h ${(dashboard?.total_minutes||0)%60}m across ${dashboard?.total_workouts||0} workouts! Every step counts. 🌿`,
       stats: { Level: lvl, 'Total XP': xp, Streak: `${streak} days`, Workouts: dashboard?.total_workouts || 0 },
       hashtags: ['FitQuest', 'FitnessJourney', 'StayActive']
     });
   }
 }

 async function openShareAchievement(a) {
   try {
     const data = await request(`/api/v1/share/achievement/${a.id}`);
     setShareData({ ...data, badge: a.icon || '🏆' });
   } catch {
     const lvl = dashboard?.level || 1;
     setShareData({
       card_type: 'achievement',
       title: `${a.icon || '🏆'} ${a.title}`,
       subtitle: a.description,
       badge: a.icon || '🏆',
       message: `🏆 Achievement Unlocked on FitQuest: '${a.title}' ${a.icon || '✨'}!\n"${a.description}"\nCurrently Level ${lvl}. Making progress every day! ✨`,
       stats: { Status: a.unlocked ? 'Unlocked' : `${a.progress}/${a.target}`, Target: a.target, Category: a.category, Level: lvl },
       hashtags: ['FitQuest', 'AchievementUnlocked', 'FitnessMilestone']
     });
   }
 }

 async function openShareWorkout(w) {
   try {
     const data = await request(`/api/v1/share/workout/${w.id}`);
     setShareData({ ...data, badge: emoji[w.activity_type] || '💪' });
   } catch {
     const dist = w.distance_km ? ` (${w.distance_km} km)` : '';
     setShareData({
       card_type: 'workout',
       title: `${pretty(w.activity_type)} Session`,
       subtitle: `${w.duration_minutes} min${dist}`,
       badge: emoji[w.activity_type] || '💪',
       photo_url: w.photo_url || null,
       message: `💪 Workout Logged on FitQuest!\n${pretty(w.activity_type)}: ${w.duration_minutes} mins${dist}.\nEffort: ${w.perceived_effort}/10. Moving forward one day at a time! 🏃‍♂️💨`,
       stats: { Activity: pretty(w.activity_type), Duration: `${w.duration_minutes} min`, Distance: w.distance_km ? `${w.distance_km} km` : 'N/A', Effort: `${w.perceived_effort}/10` },
       hashtags: ['FitQuest', 'WorkoutLogged', 'KeepMoving']
     });
   }
 }

 async function openShareQuest(q) {
   try {
     const data = await request(`/api/v1/share/quest/${q.id}`);
     setShareData({ ...data, badge: emoji[q.activity_type] || '🎯' });
   } catch {
     setShareData({
       card_type: 'quest',
       title: `Quest Cleared: ${q.title}`,
       subtitle: `+${q.xp_reward} XP · ${pretty(q.difficulty)}`,
       badge: emoji[q.activity_type] || '🎯',
       message: `🎯 Quest Cleared on FitQuest: '${q.title}' (+${q.xp_reward} XP)!\n${q.description}\nDifficulty: ${pretty(q.difficulty)} · ${q.target_minutes} min ${q.activity_type}. 🚀`,
       stats: { Reward: `+${q.xp_reward} XP`, Difficulty: pretty(q.difficulty), Target: `${q.target_minutes} min`, Activity: pretty(q.activity_type) },
       hashtags: ['FitQuest', 'QuestComplete', 'AdventureFitness']
     });
   }
 }

 async function submitWorkout(e){
   e.preventDefault();
   try {
     const res = await request('/api/v1/workouts', {
       method: 'POST',
       body: JSON.stringify({
         activity_type: form.activity_type,
         duration_minutes: Number(form.duration_minutes),
         distance_km: form.distance_km === '' ? null : Number(form.distance_km),
         perceived_effort: Number(form.perceived_effort),
         notes: form.notes || null,
         photo_url: form.photo_url || null
       })
     });
     setShowWorkout(false);
     setToast('Workout logged. Nice work!');
     setForm({activity_type:'walking',duration_minutes:'30',distance_km:'',perceived_effort:'5',notes:'',photo_url:null});
     await refresh();
     if(res?.id) openShareWorkout(res);
   } catch(e) {
     setToast(e.message);
   }
 }

 async function generateQuests(e){e?.preventDefault();setGenerating(true);try{const made=await request('/api/v1/quests/generate',{method:'POST',body:JSON.stringify({fitness_goal:goal,experience_level:level,count:Number(count)})});setQuests(old=>[...old,...made]);setToast(`${made.length} new quests unlocked`)}catch(e){setToast(e.message)}finally{setGenerating(false)}}
 async function completeQuest(q){const match=workouts.find(w=>w.activity_type===q.activity_type&&w.duration_minutes>=q.target_minutes&&(q.target_distance_km==null||(w.distance_km??0)>=q.target_distance_km));if(!match){setToast(`Log a ${q.activity_type} workout of at least ${q.target_minutes} min${q.target_distance_km?` and ${q.target_distance_km} km`:''} first.`);setShowWorkout(true);setForm(f=>({...f,activity_type:q.activity_type,duration_minutes:String(Math.max(30,q.target_minutes)),distance_km:q.target_distance_km?String(q.target_distance_km):''}));return}try{const c=await request(`/api/v1/quests/${q.id}/complete/${match.id}`,{method:'POST'});setToast(`Quest complete! +${c.xp_awarded} XP`);await refresh();openShareQuest(q);}catch(e){setToast(e.message)}}
 async function generateReview(e){e.preventDefault();setCoachBusy(true);try{setReview(await request('/api/v1/coach/review',{method:'POST',body:JSON.stringify({focus})}));setToast('Your coaching review is ready')}catch(e){setToast(e.message)}finally{setCoachBusy(false)}}

 async function sendChatMessage(overrideText) {
   const text = (overrideText || chatInput).trim();
   if (!text || chatLoading) return;
   const tempMsg = { id: Date.now(), role: 'user', content: text, created_at: new Date().toISOString() };
   setChatMessages(prev => [...prev, tempMsg]);
   setChatInput('');
   setChatLoading(true);
   try {
     const res = await request('/api/v1/coach/chat', { method: 'POST', body: JSON.stringify({ message: text }) });
     setChatMessages(res.messages);
   } catch(e) {
     setToast(e.message);
   } finally {
     setChatLoading(false);
   }
 }

 async function clearChat() {
   try {
     await request('/api/v1/coach/chat', { method: 'DELETE' });
     setChatMessages([]);
     setToast('Coach chat cleared');
   } catch(e) {
     setToast(e.message);
   }
 }

 const filteredQuests=useMemo(()=>quests.filter(q=>`${q.title} ${q.description} ${q.activity_type} ${q.difficulty}`.toLowerCase().includes(search.toLowerCase())),[quests,search]);
 const today=new Date(); const week=dashboard?.weekly_activity||[]; const maxMinutes=Math.max(30,...week.map(d=>d.total_minutes));
 const stats=[{label:'Total workouts',value:dashboard?.total_workouts??'—',unit:'sessions',icon:Activity,color:'mint'},{label:'Time outdoors',value:dashboard?Math.floor(dashboard.total_minutes/60)+'h '+dashboard.total_minutes%60+'m':'—',unit:'total time',icon:Clock3,color:'peach'},{label:'Current streak',value:dashboard?.current_streak??0,unit:'days in a row',icon:Flame,color:'yellow'},{label:'Quests cleared',value:dashboard?.completed_quests??0,unit:'adventures',icon:Target,color:'lavender'}];

 return <div className="app-shell"><aside className={`sidebar ${mobileNav?'open':''}`}><div className="brand"><div className="brand-mark"><Leaf size={22}/></div><span>fitquest<span className="brand-dot">.</span></span><button className="mobile-close" onClick={()=>setMobileNav(false)}><X size={18}/></button></div><div className="workspace-label">YOUR SPACE</div><nav>{nav.map(([name,Icon])=><button key={name} onClick={()=>navigate(name)} className={`nav-item ${page===name?'active':''}`}><Icon size={19}/><span>{name}</span>{name==='Discover quests'&&<span className="nav-count">{quests.length}</span>}</button>)}</nav><div className="sidebar-bottom"><div className="sidebar-promo"><div className="promo-orb"><Sparkles size={18}/></div><div className="promo-title">Small steps. Big energy.</div><p>Your next adventure is one tap away.</p><button onClick={()=>navigate('Discover quests')}>Find a quest <ArrowRight size={14}/></button></div><div className="profile-row"><div className="avatar">{(dashboard?.display_name||'O').slice(0,1).toUpperCase()}</div><div className="profile-text"><strong>{dashboard?.display_name||'Outdoor Explorer'}</strong><span>Level {dashboard?.level||1} explorer</span></div><ChevronDown size={16} className="muted"/></div></div></aside>
 <main className="main"><header className="topbar"><button className="mobile-menu" onClick={()=>setMobileNav(true)}><Menu/></button><div className="breadcrumb">Your space <span>/</span> <strong>{page}</strong></div><div className="top-actions"><span className="date-chip">{today.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span><button className="icon-btn" title="Share progress" onClick={openShareProgress}><Share2 size={17}/></button><button className="icon-btn" title="Refresh data" onClick={refresh}><RefreshCw size={17}/></button><button className="primary-btn small" onClick={()=>setShowWorkout(true)}><Plus size={17}/> Log workout</button></div></header>
 <div className="content"><div className="page-heading"><div><div className="eyebrow"><span className="live-dot"/> YOUR OUTDOOR ERA STARTS HERE</div><h1>{page==='Overview'?<>A little more <span className="serif-accent">outside.</span></>:page==='Discover quests'?'Find your next adventure':page==='My activity'?'Look how far you’ve come':page==='Achievements'?'Proof of your progress':'Your personal AI coach'}</h1><p className="subheading">{page==='Overview'?`Hey ${dashboard?.display_name||'explorer'}, ready to make today count?`:page==='Discover quests'?'Pick a challenge, get moving, and earn XP along the way.':page==='My activity'?'Every walk, ride, and trail adds up. Keep showing up.':page==='Achievements'?'Celebrate the little wins that make a big difference.':'Real-time conversation and tailored reflections for your outdoor journey.'}</p></div>{page==='Overview'&&<button className="outline-btn" onClick={()=>navigate('My activity')}>View activity <ArrowRight size={16}/></button>}</div>
 {error&&<div className="error-banner"><CircleHelp size={18}/><div><strong>Can’t reach your fitness data</strong><p>{error}</p><span>Start the backend, then refresh. API base: {API}</span></div><button onClick={refresh}><RefreshCw size={16}/></button></div>}
 {loading&&!dashboard?<div className="loading"><span className="spinner"/> Getting your space ready…</div>:<>
 {page==='Overview'&&<>
 <section className="hero-card"><div className="hero-copy"><div className="hero-pill"><Sparkles size={13}/> YOUR DAILY RESET</div><h2>Progress feels better<br/>when it’s <em>your own.</em></h2><p>Step outside, find your rhythm, and let the little wins stack up. You’re doing better than you think.</p><button className="hero-btn" onClick={()=>navigate('Discover quests')}>Explore quests <ArrowRight size={17}/></button><div className="hero-foot"><span><span className="tiny-check"><Check size={10}/></span> No pressure, just progress</span><span>✳ Made for the outdoors</span></div></div><div className="hero-art" aria-hidden="true"><div className="sun"></div><div className="art-ring ring1"></div><div className="art-ring ring2"></div><div className="hill hill-back"></div><div className="hill hill-front"></div><div className="art-path"></div><div className="art-leaf leaf-a">✳</div><div className="art-leaf leaf-b">✦</div><div className="art-label"><span className="art-label-icon"><Footprints size={17}/></span><span><b>One step at a time</b><small>Your pace is the right pace</small></span></div></div></section>
 <section className="stats-grid">{stats.map(({label,value,unit,icon:Icon,color})=><article className="stat-card" key={label}><div className={`stat-icon ${color}`}><Icon size={19}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-unit">{unit}</div><div className="stat-spark"><ArrowDownRight size={15}/></div></article>)}</section>
 <div className="dashboard-grid"><section className="panel activity-panel"><div className="panel-heading"><div><div className="section-kicker">YOUR RHYTHM</div><h3>A week in motion</h3></div><span className="soft-tag">Last 7 days</span></div><div className="weekly-total"><strong>{dashboard?.current_week_minutes??0}<small> min</small></strong><span>time well spent outdoors</span></div><div className="chart">{week.map((d,i)=><div className="chart-col" key={d.date}><div className="bar-wrap"><div className={`bar ${d.total_minutes?'has-value':''} ${i===week.length-1?'today-bar':''}`} style={{height:`${Math.max(d.total_minutes?8:3,d.total_minutes/maxMinutes*100)}%`}} title={`${d.total_minutes} minutes`}>{d.total_minutes>0&&<span>{d.total_minutes}</span>}</div></div><span className={`chart-day ${new Date(d.date+'T12:00:00').toDateString()===today.toDateString()?'today-day':''}`}>{new Date(d.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short'}).slice(0,2)}</span></div>)}</div><div className="chart-legend"><span><i/> Daily activity minutes</span><span>{week.reduce((n,d)=>n+d.workout_count,0)} sessions this week</span></div></section>
 <section className="panel level-panel"><div className="panel-heading"><div><div className="section-kicker">KEEP IT GOING</div><h3>Your explorer level</h3></div><div className="level-badge"><Zap size={16}/></div></div><div className="level-display"><div className="level-number">{dashboard?.level||1}</div><div><strong>Trail seeker</strong><span>Every session earns you XP</span></div></div><div className="xp-track"><div style={{width:`${dashboard?((dashboard.total_xp%100)):0}%`}}/></div><div className="xp-labels"><span>{dashboard?.total_xp??0} total XP</span><span>{dashboard?.xp_to_next_level??100} XP to level up</span></div><div className="level-divider"/><div className="level-tip"><div className="tip-icon"><Sparkles size={17}/></div><div><strong>A little inspiration</strong><p>Consistency beats intensity. Even a 10-minute walk is a win worth celebrating.</p></div></div><div style={{display:'flex',gap:'10px',marginTop:'16px'}}><button className="text-link" onClick={()=>navigate('Achievements')}>See achievements <ArrowRight size={14}/></button><button className="share-btn unlocked" onClick={openShareProgress} style={{marginLeft:'auto'}}><Share2 size={12}/> Share progress</button></div></section></div>
 <section className="panel quests-section"><div className="panel-heading"><div><div className="section-kicker">MADE FOR YOUR MOMENT</div><h3>Quests to get you out there</h3></div><button className="text-link" onClick={()=>navigate('Discover quests')}>All quests <ArrowRight size={15}/></button></div>{quests.length?<div className="quest-grid">{quests.slice(0,3).map(q=><QuestCard key={q.id} q={q} onComplete={completeQuest} onShare={openShareQuest}/>)}</div>:<Empty icon={Target} title="Your next adventure awaits" text="Generate a few personalized quests to get started." action="Discover quests" onAction={()=>navigate('Discover quests')}/>}</section>
 <section className="bottom-row"><div className="panel recent-panel"><div className="panel-heading"><div><div className="section-kicker">THE LITTLE WINS</div><h3>Recent activity</h3></div><button className="text-link" onClick={()=>navigate('My activity')}>View all <ArrowRight size={14}/></button></div>{workouts.length?<div className="recent-list">{workouts.slice(0,3).map(w=><WorkoutRow key={w.id} w={w} onShare={openShareWorkout} onViewPhoto={setActivePhoto}/>)}</div>:<Empty icon={Footprints} title="Your story starts here" text="Log your first workout. Future you will be glad you did." action="Log a workout" onAction={()=>setShowWorkout(true)}/>}</div><div className="quote-card"><div className="quote-mark">“</div><p>You don’t have to see the whole staircase. Just take the first step.</p><span>YOUR GENTLE REMINDER TODAY</span><div className="quote-decoration">✳</div></div></section>
 </>}
 {page==='Discover quests'&&<><section className="quest-spotlight"><div className="spotlight-icon"><WandSparkles size={26}/></div><div className="spotlight-copy"><div className="section-kicker">A CHALLENGE THAT FITS YOU</div><h2>Your next chapter starts <em>outside.</em></h2><p>Let AI turn your goal into realistic outdoor adventures built around your experience.</p></div><button className="primary-btn" onClick={()=>document.getElementById('quest-generator')?.scrollIntoView({behavior:'smooth',block:'center'})}><Sparkles size={16}/> Create my quests</button></section><section className="panel generator-panel" id="quest-generator"><div className="panel-heading"><div><div className="section-kicker">PERSONALIZED BY AI</div><h3>Build your quest list</h3></div><div className="ai-tag"><Sparkles size={13}/> AI powered</div></div><form className="generator-form" onSubmit={generateQuests}><label className="field full-field">What are you working toward?<input value={goal} onChange={e=>setGoal(e.target.value)} minLength="3" maxLength="200" required/></label><label className="field">Your current level<select value={level} onChange={e=>setLevel(e.target.value)}><option value="beginner">Just getting started</option><option value="intermediate">Finding my rhythm</option><option value="advanced">Ready for a challenge</option></select></label><label className="field">How many quests?<select value={count} onChange={e=>setCount(e.target.value)}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} quests</option>)}</select></label><button className="primary-btn" disabled={generating}><Sparkles size={16}/>{generating?'Dreaming up quests…':'Generate my quests'}</button></form></section><div className="list-heading"><div><div className="section-kicker">YOUR ADVENTURE BOARD</div><h3>Available quests <span className="count-pill">{filteredQuests.length}</span></h3></div><div className="search-box"><Activity size={16}/><input placeholder="Find a quest…" value={search} onChange={e=>setSearch(e.target.value)}/></div></div>{filteredQuests.length?<div className="quest-grid quest-grid-wide">{filteredQuests.map(q=><QuestCard key={q.id} q={q} onComplete={completeQuest} onShare={openShareQuest}/>)}</div>:<div className="panel"><Empty icon={Target} title={search?'No quests match that search':'No quests just yet'} text={search?'Try another activity or keyword.':'Create your first personalized quest above.'} action={search?'Clear search':'Generate quests'} onAction={()=>search?setSearch(''):document.getElementById('quest-generator')?.scrollIntoView({behavior:'smooth'})}/></div>}</>}
 {page==='My activity'&&<><section className="activity-summary"><div><div className="section-kicker">YOUR PROGRESS, YOUR PACE</div><h2>Showing up is the <em>achievement.</em></h2><p>Every entry is a little promise you kept to yourself.</p></div><div style={{display:'flex',gap:'10px'}}><button className="outline-btn" onClick={openShareProgress}><Share2 size={16}/> Share progress</button><button className="primary-btn" onClick={()=>setShowWorkout(true)}><Plus size={17}/> Log activity</button></div></section><section className="stats-grid">{stats.map(({label,value,unit,icon:Icon,color})=><article className="stat-card" key={label}><div className={`stat-icon ${color}`}><Icon size={19}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-unit">{unit}</div></article>)}</section><section className="panel history-panel"><div className="panel-heading"><div><div className="section-kicker">YOUR JOURNEY SO FAR</div><h3>Activity history</h3></div><span className="soft-tag">{workouts.length} logged</span></div>{workouts.length?<div className="history-list">{workouts.map(w=><WorkoutRow key={w.id} w={w} detailed onShare={openShareWorkout} onViewPhoto={setActivePhoto}/>)}</div>:<Empty icon={Footprints} title="Every journey starts somewhere" text="Your logged workouts will show up here." action="Log your first workout" onAction={()=>setShowWorkout(true)}/>}</section></>}
 {page==='Achievements'&&<><section className="achievement-banner"><div className="achievement-big-icon"><Trophy size={34}/></div><div><div className="section-kicker">LOOK AT YOU GO</div><h2>Wins worth <em>celebrating.</em></h2><p>{achievements.filter(a=>a.unlocked).length} of {achievements.length} milestones unlocked. Keep going at your own pace.</p></div><div style={{display:'flex',alignItems:'center',gap:'14px'}}><button className="outline-btn" onClick={openShareProgress}><Share2 size={15}/> Share stats</button><div className="achievement-score"><strong>{achievements.length?Math.round(achievements.filter(a=>a.unlocked).length/achievements.length*100):0}%</strong><span>collected</span></div></div></section><div className="achievement-grid">{achievements.map(a=><article className={`achievement-card ${a.unlocked?'unlocked':''}`} key={a.id}><div className="achievement-icon">{a.icon}</div><div className="achievement-card-title">{a.title}</div><p>{a.description}</p><div className="achievement-progress"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',width:'100%',marginBottom:'7px'}}><div><span>{a.unlocked?'Unlocked':`${a.progress} / ${a.target}`}</span>{a.unlocked&&<Check size={14} style={{marginLeft:'4px'}}/>}</div><button className={`share-btn ${a.unlocked?'unlocked':''}`} onClick={e=>{e.stopPropagation();openShareAchievement(a)}} title="Share achievement"><Share2 size={12}/> {a.unlocked?'Share win':'Share'}</button></div><div className="mini-track"><span style={{width:`${Math.min(100,a.progress/a.target*100)}%`}}/></div></div></article>)}</div></>}
 {page==='AI coach'&&<><section className="coach-hero"><div className="coach-orbit"><div className="coach-sun"><Sparkles size={29}/></div><span className="orbit-dot dot-one"/><span className="orbit-dot dot-two"/></div><div><div className="section-kicker">YOUR OUTDOOR COMPANION</div><h2>Meet your personal <em>coach.</em></h2><p>Ask real-time questions about your routine, stiffness, goals, or get a deep weekly reflection.</p></div></section>
 
 <div className="coach-tabs">
   <button className={`coach-tab-btn ${coachTab==='chat'?'active':''}`} onClick={()=>setCoachTab('chat')}><MessageSquare size={15}/> Chat with Coach</button>
   <button className={`coach-tab-btn ${coachTab==='review'?'active':''}`} onClick={()=>setCoachTab('review')}><FileText size={15}/> Weekly Review</button>
 </div>

 {coachTab==='chat'&&<section className="chat-box">
   <div className="panel-heading" style={{marginBottom:'15px'}}>
     <div><div className="section-kicker">REAL-TIME COACHING</div><h3>Conversation with Coach</h3></div>
     <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
       <div className="ai-tag"><Sparkles size={13}/> FitQuest AI</div>
       {chatMessages.length>0&&<button className="chat-clear-btn" onClick={clearChat} title="Clear conversation"><Trash2 size={15}/></button>}
     </div>
   </div>

   <div className="chat-messages">
     {chatMessages.length===0?<div className="coach-empty" style={{padding:'20px 0'}}>
       <div className="coach-empty-art" style={{width:'50px',height:'50px'}}><Leaf size={26}/></div>
       <h3>Ready when you are</h3>
       <p>Ask for advice, guidance on recovery, or motivation for your next walk.</p>
     </div>:chatMessages.map(m=><div key={m.id} className={`chat-msg ${m.role}`}>
       <div className="chat-avatar">{m.role==='user'?(dashboard?.display_name||'O').slice(0,1).toUpperCase():<Leaf size={16}/>}</div>
       <div>
         <div className="chat-bubble">{m.content}</div>
         {m.created_at&&<span className="chat-msg-time">{new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>}
       </div>
     </div>)}
     {chatLoading&&<div className="chat-msg assistant">
       <div className="chat-avatar"><Leaf size={16}/></div>
       <div className="chat-bubble"><div className="typing-dots"><span/><span/><span/></div> Coach is thinking…</div>
     </div>}
     <div ref={chatBottomRef}/>
   </div>

   <div className="chat-suggestions">
     {["I'm feeling a bit stiff today, what's a gentle walk routine?", "How can I build stamina gradually?", "Tips for making outdoor activity a consistent habit", "How should I pace my first outdoor run?"].map((s,i)=><button key={i} className="suggestion-chip" onClick={()=>sendChatMessage(s)}><Sparkles size={12}/> {s}</button>)}
   </div>

   <form className="chat-input-bar" onSubmit={e=>{e.preventDefault();sendChatMessage();}}>
     <input placeholder="Ask your outdoor fitness coach anything…" value={chatInput} onChange={e=>setChatInput(e.target.value)} disabled={chatLoading}/>
     <button className="primary-btn" type="submit" disabled={chatLoading||!chatInput.trim()} style={{height:'44px',padding:'0 18px'}}>
       <Send size={16}/> Send
     </button>
   </form>
 </section>}

 {coachTab==='review'&&<><section className="panel coach-form-panel"><div className="panel-heading"><div><div className="section-kicker">LET’S REFLECT</div><h3>What would you like to focus on?</h3></div><div className="ai-tag"><Sparkles size={13}/> FitQuest AI</div></div><form className="coach-form" onSubmit={generateReview}><label className="field">Your focus<input value={focus} onChange={e=>setFocus(e.target.value)} minLength="3" maxLength="200" required placeholder="e.g. Build stamina and stay consistent"/></label><button className="primary-btn" disabled={coachBusy}><Sparkles size={16}/>{coachBusy?'Reviewing your activity…':'Generate my review'}</button></form><p className="form-note"><CircleHelp size={14}/> Your review uses your recent workout history. AI feedback is a guide, not medical advice.</p></section>{review?<section className="panel review-panel"><div className="review-header"><div className="review-icon"><Sparkles size={19}/></div><div><div className="section-kicker">YOUR LATEST REVIEW</div><h3>A moment to reflect</h3></div><span className="soft-tag">{review.workouts_analyzed} workouts analyzed</span></div><p className="review-summary">{review.summary}</p><div className="review-columns"><div><h4><span className="review-bullet green"/>What you’re doing well</h4><ul>{review.strengths.map((s,i)=><li key={i}>{s}</li>)}</ul></div><div><h4><span className="review-bullet orange"/>Ideas to try next</h4><ul>{review.suggestions.map((s,i)=><li key={i}>{s}</li>)}</ul></div></div><div className="next-goal"><div className="next-goal-icon"><Target size={20}/></div><div><span>YOUR GENTLE GOAL FOR NEXT WEEK</span><p>{review.next_week_goal}</p></div></div></section>:<div className="coach-empty"><div className="coach-empty-art"><Leaf size={34}/></div><h3>Your story is still unfolding</h3><p>Generate a review to get thoughtful feedback on the activity you’ve logged so far.</p></div>}</>}
 </>}
 </>}
 <footer className="footer"><span>✳ Made for the moments that move you.</span><span>FITQUEST <i>·</i> YOUR PACE, YOUR PLACE</span></footer></div></main>
 
 {showWorkout&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowWorkout(false)}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="workout-title"><div className="modal-heading"><div><div className="section-kicker">A WIN IS A WIN</div><h2 id="workout-title">Log your workout</h2><p>Count the effort, not just the miles.</p></div><button className="icon-btn" onClick={()=>setShowWorkout(false)}><X size={19}/></button></div><form onSubmit={submitWorkout} className="workout-form"><label className="field">Activity type<select value={form.activity_type} onChange={e=>setForm({...form,activity_type:e.target.value})}>{['walking','running','cycling','hiking'].map(a=><option key={a} value={a}>{pretty(a)}</option>)}</select></label><div className="form-two"><label className="field">Duration (minutes)<input type="number" min="1" max="1440" required value={form.duration_minutes} onChange={e=>setForm({...form,duration_minutes:e.target.value})}/></label><label className="field">Distance (km)<input type="number" min="0" max="1000" step="0.01" placeholder="Optional" value={form.distance_km} onChange={e=>setForm({...form,distance_km:e.target.value})}/></label></div><label className="field">How did it feel? <span className="field-hint">{form.perceived_effort}/10 effort</span><input type="range" min="1" max="10" value={form.perceived_effort} onChange={e=>setForm({...form,perceived_effort:e.target.value})}/><div className="range-labels"><span>Easy breezy</span><span>All out</span></div></label>
 
 <div className="field">
   <span>Trail photo (optional)</span>
   {form.photo_url?<div className="photo-preview-wrap"><img src={form.photo_url} alt="Attached trail view"/><button type="button" className="photo-remove-btn" onClick={()=>setForm({...form,photo_url:null})} title="Remove photo"><X size={14}/></button></div>:<label className="photo-upload-zone"><Camera size={20} color="#3c6b47"/><span>Attach trail photo or selfie</span><small>Adds a scenic touch to your social share card</small><input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{if(e.target.files?.[0])compressPhoto(e.target.files[0],uri=>setForm({...form,photo_url:uri}))}}/></label>}
 </div>

 <label className="field">A note to future you <textarea rows="3" maxLength="1000" placeholder="How did it feel out there?" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><div className="modal-actions"><button type="button" className="outline-btn" onClick={()=>setShowWorkout(false)}>Cancel</button><button className="primary-btn" type="submit"><Check size={17}/> Save workout</button></div></form></section></div>}
 
 {activePhoto&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setActivePhoto(null)}}><div style={{maxWidth:'90vw',maxHeight:'90vh',position:'relative'}}><img src={activePhoto} alt="Trail capture" style={{maxWidth:'100%',maxHeight:'80vh',borderRadius:'16px',boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}}/><button className="icon-btn" onClick={()=>setActivePhoto(null)} style={{position:'absolute',top:'10px',right:'10px'}}><X size={18}/></button></div></div>}

 {shareData&&<ShareModal data={shareData} onClose={()=>setShareData(null)} onToast={setToast}/>}
 {toast&&<div className="toast"><div className="toast-check"><Check size={15}/></div><span>{toast}</span><button onClick={()=>setToast('')}><X size={15}/></button></div>}
 </div>
}

function QuestCard({q,onComplete,onShare}){const Icon=icons[q.activity_type]||Activity;return <article className="quest-card"><div className={`quest-art ${q.activity_type}`}><span className="quest-emoji">{emoji[q.activity_type]||'🌿'}</span><span className={`difficulty ${q.difficulty}`}>{q.difficulty}</span><span className="quest-art-spark">✳</span></div><div className="quest-card-body"><div className="quest-meta"><span><Icon size={14}/>{pretty(q.activity_type)}</span><span><Clock3 size={14}/>{q.target_minutes} min</span></div><h4>{q.title}</h4><p>{q.description}</p>{q.target_distance_km&&<div className="distance-chip"><Mountain size={13}/> Aim for {q.target_distance_km} km</div>}<div className="quest-card-footer"><span className="xp-reward"><Zap size={15}/>{q.xp_reward} XP</span><div style={{display:'flex',gap:'6px',alignItems:'center'}}>{onShare&&<button className="icon-btn-inline" onClick={()=>onShare(q)} title="Share quest"><Share2 size={13}/></button>}<button className="quest-action" onClick={()=>onComplete(q)} aria-label={`Complete ${q.title}`}>Take it on <ArrowRight size={15}/></button></div></div></div></article>}

function WorkoutRow({w,detailed=false,onShare,onViewPhoto}){
  const Icon=icons[w.activity_type]||Activity;
  const [imgError, setImgError] = useState(false);
  return <div className="workout-row">
    {w.photo_url && !imgError ? (
      <img src={w.photo_url} alt="Trail thumbnail" className="workout-thumb" onError={()=>setImgError(true)} onClick={()=>onViewPhoto?.(w.photo_url)} title="Click to view photo"/>
    ) : (
      <div className={`workout-icon ${w.activity_type}`}><Icon size={19}/></div>
    )}
    <div className="workout-info">
      <strong>{pretty(w.activity_type)} session</strong>
      <span>{w.notes||`${w.perceived_effort}/10 effort`}</span>
      {detailed&&w.notes&&<small>{w.perceived_effort}/10 effort</small>}
    </div>
    <div className="workout-metrics">
      <strong>{w.duration_minutes}<small> min</small></strong>
      {w.distance_km!=null&&<span>{w.distance_km} km</span>}
    </div>
    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
      {onShare&&<button className="icon-btn-inline" onClick={()=>onShare(w)} title="Share workout"><Share2 size={13}/></button>}
      <div className="workout-date">{dateLabel(w.completed_at)}</div>
    </div>
  </div>;
}

function Empty({icon:Icon,title,text,action,onAction}){return <div className="empty-state"><div className="empty-icon"><Icon size={22}/></div><strong>{title}</strong><p>{text}</p>{action&&<button className="text-link" onClick={onAction}>{action} <ArrowRight size={14}/></button>}</div>}

createRoot(document.getElementById('root')).render(<App/>);
