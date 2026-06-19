import { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Settings, 
  RotateCcw, 
  Clipboard, 
  Check, 
  Plus, 
  Trash2, 
  ArrowRight, 
  Sliders, 
  Cpu, 
  FileText, 
  Milestone, 
  Compass, 
  Briefcase, 
  MessageSquare, 
  CheckSquare, 
  HelpCircle, 
  X, 
  ChevronRight, 
  TrendingUp, 
  Languages, 
  Lightbulb,
  CornerDownLeft,
  Calendar,
  Layers
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  presetName?: string;
}

interface MilestonePhase {
  phase: string;
  title: string;
  tasks: string[];
}

interface ProjectPlan {
  title: string;
  description: string;
  timeline: string;
  milestones: MilestonePhase[];
}

interface StoryboardScene {
  sceneNumber: number;
  visualPrompt: string;
  caption: string;
  mood: string;
}

interface Storyboard {
  storyTitle: string;
  scenes: StoryboardScene[];
}

export default function App() {
  // -------------------------------------------------------------
  // Global & In-App Toast States
  // -------------------------------------------------------------
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 4000);
  };

  // -------------------------------------------------------------
  // Text Editor Deck & Enhancer States
  // -------------------------------------------------------------
  const [editorText, setEditorText] = useState<string>(() => {
    return localStorage.getItem('ai_lab_editor_text') || 
      '# Product Launch Strategy\n\nAI Lab & Workspace allows creators to draft elite documents and brainstorm concepts instantly.\n\nWrite your concepts or notes here, then use the editorial actions below to expand, rewrite or adjust the tone seamlessly.';
  });
  
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [selectionResult, setSelectionResult] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<string>('Professional 💼');

  useEffect(() => {
    localStorage.setItem('ai_lab_editor_text', editorText);
  }, [editorText]);

  const handleEnhance = async (action: string, customTone?: string) => {
    if (!editorText.trim()) {
      showToast('The editor is empty. Add some text first!', 'error');
      return;
    }
    
    setIsEnhancing(true);
    setLastAction(action);
    setSelectionResult(null);

    try {
      const response = await fetch('/api/editor/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: editorText,
          action: action,
          tone: customTone || selectedTone
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSelectionResult(data.text);
        showToast('Editorial analysis complete!', 'success');
      } else {
        showToast(data.error || 'Editorial server failed', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Workspace network error. Ensure server is online.', 'error');
    } finally {
      setIsEnhancing(false);
    }
  };

  const applyEditorResult = (mode: 'replace' | 'append') => {
    if (!selectionResult) return;
    if (mode === 'replace') {
      setEditorText(selectionResult);
      showToast('Document text replaced.', 'success');
    } else {
      setEditorText(prev => prev + '\n\n' + selectionResult);
      showToast('Enhanced content appended to end.', 'success');
    }
    setSelectionResult(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  };

  // -------------------------------------------------------------
  // Smart Labs Side Pane States
  // -------------------------------------------------------------
  const [labTab, setLabTab] = useState<'companion' | 'planner' | 'storyboard' | 'prompts'>('companion');

  // Tab 1: Companion (Chat)
  const [chatMessages, setChatMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('ai_lab_chat');
    return saved ? JSON.parse(saved) : [
      {
        id: 'initial',
        role: 'model',
        content: 'Greetings, Creator. I am your specialized Lab Companion. Choose a conceptual preset or adjust the temperature sliders in the panel above to begin refining your thesis.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatPreset, setChatPreset] = useState<string>('Creative Brainstormer 💡');
  const [chatTemperature, setChatTemperature] = useState<number>(0.7);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('ai_lab_chat', JSON.stringify(chatMessages));
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const presetInstructions: Record<string, string> = {
    'Creative Brainstormer 💡': 'You are a highly imaginative, lateral-thinking creative consultant. You suggest rich, unconventional ideas, vivid sensory details, and narrative Hooks.',
    'Meticulous Critic 🔍': 'You are a critical, highly analytical product strategist. You seek potential logical flaws, explore edge-cases, analyze operational risks, and provide highly constructive critiques.',
    'Senior Code Mentor 💻': 'You are a pragmatic, highly competent Principal Software Engineer. You explain clean code designs, refactor logic, model domain hierarchies, and debug securely.',
    'Socratic Explainer 🎓': 'You are a clear conceptual teacher. You utilize the Feynman Technique, breaking down complex terminology to its fundamental logical building blocks.'
  };

  const handleSendChat = async (directPrompt?: string) => {
    const query = directPrompt || chatInput;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!directPrompt) setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          systemInstruction: presetInstructions[chatPreset] || 'You are a helpful lab companion.',
          temperature: chatTemperature
        })
      });

      const data = await response.json();
      if (response.ok) {
        setChatMessages(prev => [...prev, {
          id: `msg-${Date.now() + 1}`,
          role: 'model',
          content: data.text,
          presetName: chatPreset,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } else {
        showToast(data.error || 'Chat agent failed respond', 'error');
      }
    } catch {
      showToast('Network error, check lab companion connectivity.', 'error');
    } finally {
      setChatLoading(false);
    }
  };

  const clearChat = () => {
    setChatMessages([
      {
        id: 'initial',
        role: 'model',
        content: 'Chat wiped. Ready for fresh analytical sessions.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Tab 2: Strategic Goal Planner
  const [goalInput, setGoalInput] = useState('Launch a weekly AI tech newsletter on Substack');
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [activePlan, setActivePlan] = useState<ProjectPlan | null>(() => {
    const saved = localStorage.getItem('ai_lab_active_plan');
    return saved ? JSON.parse(saved) : null;
  });
  const [checkedTasks, setCheckedTasks] = useState<string[]>(() => {
    const saved = localStorage.getItem('ai_lab_checked_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (activePlan) {
      localStorage.setItem('ai_lab_active_plan', JSON.stringify(activePlan));
    } else {
      localStorage.removeItem('ai_lab_active_plan');
    }
  }, [activePlan]);

  useEffect(() => {
    localStorage.setItem('ai_lab_checked_tasks', JSON.stringify(checkedTasks));
  }, [checkedTasks]);

  const handleGeneratePlan = async () => {
    if (!goalInput.trim()) {
      showToast('Please type a target goal first!', 'error');
      return;
    }
    setPlannerLoading(true);
    setCheckedTasks([]);
    try {
      const response = await fetch('/api/generator/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goalInput })
      });
      const data = await response.json();
      if (response.ok && data.title) {
        setActivePlan(data);
        showToast('Strategic project plan generated!', 'success');
      } else {
        showToast(data.error || 'Strategic planner error', 'error');
      }
    } catch {
      showToast('Network timeout. Please retry.', 'error');
    } finally {
      setPlannerLoading(false);
    }
  };

  const toggleTask = (taskName: string) => {
    setCheckedTasks(prev => {
      if (prev.includes(taskName)) {
        return prev.filter(t => t !== taskName);
      } else {
        return [...prev, taskName];
      }
    });
  };

  const getTotalTasksCount = () => {
    if (!activePlan) return 0;
    return activePlan.milestones.reduce((acc, m) => acc + m.tasks.length, 0);
  };

  const getCompletedPercentage = () => {
    const total = getTotalTasksCount();
    if (total === 0) return 0;
    return Math.round((checkedTasks.length / total) * 100);
  };

  // Tab 3: Narrative Video/Storyboard
  const [scriptInput, setScriptInput] = useState('An ancient librarian in a floating sky library finds a glowing book written in a modern programming language.');
  const [storyboardLoading, setStoryboardLoading] = useState(false);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(() => {
    const saved = localStorage.getItem('ai_lab_storyboard');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (storyboard) {
      localStorage.setItem('ai_lab_storyboard', JSON.stringify(storyboard));
    } else {
      localStorage.removeItem('ai_lab_storyboard');
    }
  }, [storyboard]);

  const handleGenerateStoryboard = async () => {
    if (!scriptInput.trim()) {
      showToast('Type a screenplay script or narrative idea first.', 'error');
      return;
    }
    setStoryboardLoading(true);
    try {
      const response = await fetch('/api/generator/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: scriptInput })
      });
      const data = await response.json();
      if (response.ok && data.storyTitle) {
        setStoryboard(data);
        showToast('Storyboard elements compiled!', 'success');
      } else {
        showToast(data.error || 'Storyboard generation failed.', 'error');
      }
    } catch {
      showToast('Network error, verify storyboard server.', 'error');
    } finally {
      setStoryboardLoading(false);
    }
  };

  // Tab 4: Prompt Pre-sets Deck
  const curatedPrompts = [
    {
      title: '💡 Idea Incubator',
      desc: 'Rapidly generate 5 adjacent ideas for a specific core project focus.',
      text: 'Provide exactly 5 highly imaginative, adjacent design expansions or spin-off ideas based on this target topic: '
    },
    {
      title: '🎓 Socratic Tutor',
      desc: 'Request structured tutoring explanation on a scientific or mathematical concept.',
      text: 'Break down the core principles of this concept step-by-step using first-principles logical synthesis: '
    },
    {
      title: '💼 Elevator Pitch Pro',
      desc: 'Transform raw specs into an elite hook and value proposition.',
      text: 'Compose an elite, captivating 3-sentence elevator pitch targeting global investors for: '
    },
    {
      title: '🔍 Edge-Case Analyst',
      desc: 'Formulate potential security vulnerabilities or business logical risks.',
      text: 'Analyze the following architectural flow or code concept and identify exactly 3 high-impact logical vulnerabilities or corner-case issues that could break the application: '
    }
  ];

  const handleApplyPreset = (promptText: string) => {
    setChatInput(promptText);
    setLabTab('companion');
    showToast('Prompt layout injected. Type details and send!', 'info');
  };

  // -------------------------------------------------------------
  // Dynamic Page Clock
  // -------------------------------------------------------------
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#faf9f6] text-slate-800 font-sans antialiased selection:bg-amber-100 flex flex-col">
      
      {/* -------------------------------------------------------------
          In-App Animated Notification Toast
      ------------------------------------------------------------- */}
      {toast && (
        <div id="toast-banner" className={`fixed top-4 right-4 z-50 flex items-center gap-2 max-w-sm p-4 rounded-xl shadow-lg border animate-slide-in transition-all duration-300 ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-100/80 text-emerald-800' :
          toast.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' :
          'bg-slate-50 border-slate-200 text-slate-800'
        }`}>
          {toast.type === 'success' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
          {toast.type === 'error' && <X className="w-4 h-4 text-rose-600 shrink-0" />}
          <p className="text-xs font-semibold select-none">{toast.message}</p>
          <button id="toast-close-btn" onClick={() => setToast(null)} className="ml-auto hover:bg-slate-200/50 p-1 rounded-md transition-colors">
            <X className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------
          Header Bar
      ------------------------------------------------------------- */}
      <header id="header-bar" className="bg-white border-b border-slate-100/80 py-4 px-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div id="logo-icon" className="p-2 sm:p-2.5 bg-amber-50 rounded-xl text-amber-600 border border-amber-100 shadow-sm flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 id="app-title" className="text-lg font-bold tracking-tight text-slate-900 leading-tight">AI Lab & Workspace</h1>
              <p id="app-sub-desc" className="text-xxs sm:text-xxs text-slate-400 font-medium">Professional Creative Workspace & Tool Laboratory</p>
            </div>
          </div>
          
          <div className="flex items-center flex-wrap justify-center gap-3">
            {/* Server Online Status */}
            <div id="server-badge" className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-xxs font-semibold rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Gemini 3.5-flash Online
            </div>

            {/* Local Time Date Display */}
            <div id="clock-display" className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-600 text-xxs font-medium rounded-full border border-slate-100">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{currentTime}</span>
            </div>

            {/* Reset Defaults */}
            <button 
              id="reset-state-button"
              onClick={() => {
                if (confirm('Reset entire workspace values? This clears current editor and chat history.')) {
                  localStorage.clear();
                  setEditorText('# Product Launch Strategy\n\nWrite your concepts or notes here, then use the editorial actions below.');
                  setSelectionResult(null);
                  setChatMessages([{
                    id: 'initial',
                    role: 'model',
                    content: 'Lab history wiped. Let us start fresh.',
                    timestamp: new Date().toLocaleTimeString()
                  }]);
                  setActivePlan(null);
                  setCheckedTasks([]);
                  setStoryboard(null);
                  showToast('Workspace successfully restored to defaults.', 'info');
                }
              }}
              title="Reset Workspace"
              className="p-1.5 bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-150 active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------
          Main Content Deck (Bento Grid)
      ------------------------------------------------------------- */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* =============================================================
            LEFT DECK: Editorial Workspace (Span 7)
           ============================================================= */}
        <section id="editor-deck" className="lg:col-span-7 flex flex-col gap-6 h-full">
          <div className="bg-white border border-slate-100/80 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-4">
            
            {/* Header statistics info */}
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-bold text-slate-800">Editorial Design Deck</h2>
              </div>
              <div className="flex items-center gap-2 text-xxs font-medium text-slate-400">
                <span>{editorText.length} characters</span>
                <span className="text-slate-200">|</span>
                <span>{editorText.split(/\s+/).filter(Boolean).length} words</span>
              </div>
            </div>

            {/* Interactive Raw Textarea Workspace */}
            <div className="relative group">
              <textarea
                id="workspace-textarea"
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
                placeholder="Draft notes, outlines, meeting plans, or articles here..."
                className="w-full min-h-[360px] max-h-[500px] p-4 text-sm text-slate-700 bg-slate-50/50 rounded-xl border border-slate-200/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono leading-relaxed"
                style={{ resize: 'vertical' }}
              />
              <button 
                id="editor-clear-btn"
                onClick={() => {
                  setEditorText('');
                  showToast('Workspace Editor wiped clean.', 'info');
                }}
                className="absolute top-2.5 right-2.5 p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 border border-slate-200 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm"
                title="Wipe Editor"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Editorial Helpers Block */}
            <div className="flex flex-col gap-3.5 bg-slate-50/50 border border-slate-100 rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xxs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Professional Edits
                </span>
                
                {/* Tone modifier layout selector */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-xxs text-slate-500 font-medium">Style Tone:</span>
                  <select 
                    id="tone-picker"
                    value={selectedTone} 
                    onChange={(e) => setSelectedTone(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-700 font-medium px-2 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-xxs uppercase tracking-wide cursor-pointer"
                  >
                    <option>Professional 💼</option>
                    <option>Creative 🎨</option>
                    <option>Casual ☕</option>
                    <option>Technical 🔬</option>
                  </select>
                </div>
              </div>

              {/* Action grid layout */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  id="btn-action-expand"
                  onClick={() => handleEnhance('expand')}
                  disabled={isEnhancing}
                  className="px-3 py-2 bg-white border border-slate-200 hover:border-amber-300 text-slate-700 font-medium text-xs rounded-lg shadow-xxs hover:bg-amber-50/35 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  ✨ Expand
                </button>
                <button
                  id="btn-action-rewrite"
                  onClick={() => handleEnhance('rewrite')}
                  disabled={isEnhancing}
                  className="px-3 py-2 bg-white border border-slate-200 hover:border-amber-300 text-slate-700 font-medium text-xs rounded-lg shadow-xxs hover:bg-amber-50/35 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  ✍️ Rewrite
                </button>
                <button
                  id="btn-action-summarize"
                  onClick={() => handleEnhance('summarize')}
                  disabled={isEnhancing}
                  className="px-3 py-2 bg-white border border-slate-200 hover:border-amber-300 text-slate-700 font-medium text-xs rounded-lg shadow-xxs hover:bg-amber-50/35 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  📝 Summarize
                </button>
                <button
                  id="btn-action-checklist"
                  onClick={() => handleEnhance('action_items')}
                  disabled={isEnhancing}
                  className="px-3 py-2 bg-white border border-slate-200 hover:border-amber-300 text-slate-700 font-medium text-xs rounded-lg shadow-xxs hover:bg-amber-50/35 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  📋 Actions Checklist
                </button>
              </div>

              {/* Apply custom tone trigger */}
              <button
                id="btn-apply-tone"
                onClick={() => handleEnhance('change_tone')}
                disabled={isEnhancing}
                className="w-full py-2 bg-slate-900 text-slate-50 hover:bg-slate-800 text-xs font-semibold rounded-lg shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                Apply Chosen Tone: <span className="underline italic">{selectedTone}</span>
              </button>
            </div>

            {/* Waiting/Progress indicator */}
            {isEnhancing && (
              <div id="editor-loading-screen" className="flex flex-col items-center justify-center py-6 gap-2 bg-amber-50/20 border border-amber-100 rounded-xl animate-pulse">
                <Cpu className="w-5 h-5 text-amber-500 animate-spin" />
                <span className="text-xxs font-bold text-amber-800 uppercase tracking-widest">Processing Document with Gemini AI...</span>
              </div>
            )}
          </div>

          {/* Proposal Review Diff Drawer inside the Workspace */}
          {selectionResult && (
            <div id="review-drawer" className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-4 sm:p-5 flex flex-col gap-4 text-slate-200 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-100 uppercase tracking-widest">AI Editorial Draft Proposal</span>
                </div>
                <button 
                  id="close-drawer-btn"
                  onClick={() => {
                    setSelectionResult(null);
                    showToast('Proposal closed.', 'info');
                  }} 
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Draft Body Content */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-[300px] overflow-y-auto text-sm leading-relaxed text-slate-300 font-mono whitespace-pre-wrap">
                {selectionResult}
              </div>

              {/* Accept & Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 justify-between items-center bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                <span className="text-xxs font-bold text-slate-400 uppercase tracking-wide">Action: {lastAction === 'change_tone' ? 'Change Tone' : lastAction}</span>
                <div className="flex items-center flex-wrap gap-2">
                  <button
                    id="btn-propose-replace"
                    onClick={() => applyEditorResult('replace')}
                    className="px-3 py-1.5 bg-amber-500 text-slate-950 hover:bg-amber-400 hover:scale-[1.01] text-xxs font-bold uppercase rounded-lg shadow-sm transition-all"
                  >
                    Replace Entire Document
                  </button>
                  <button
                    id="btn-propose-append"
                    onClick={() => applyEditorResult('append')}
                    className="px-3 py-1.5 bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 hover:scale-[1.01] text-xxs font-bold uppercase rounded-lg shadow-sm transition-all border border-slate-700"
                  >
                    Append to End
                  </button>
                  <button
                    id="btn-propose-copy"
                    onClick={() => copyToClipboard(selectionResult)}
                    className="p-1.5 bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-all"
                    title="Copy Draft"
                  >
                    <Clipboard className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* =============================================================
            RIGHT PANEL: Intelligent Lab Tools Span 5
           ============================================================= */}
        <section id="smart-labs-deck" className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white border border-slate-100/80 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-4">
            
            {/* Labs Tab Bar Router */}
            <div className="flex border-b border-slate-100 pb-1 gap-1 flex-wrap">
              <button
                id="tab-companion"
                onClick={() => setLabTab('companion')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wider flex items-center gap-1.5 ${
                  labTab === 'companion' 
                    ? 'bg-amber-50 text-amber-800 font-bold border-b-2 border-amber-500' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> Companion
              </button>
              
              <button
                id="tab-planner"
                onClick={() => setLabTab('planner')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wider flex items-center gap-1.5 ${
                  labTab === 'planner' 
                    ? 'bg-amber-50 text-amber-800 font-bold border-b-2 border-amber-500' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Milestone className="w-3.5 h-3.5" /> Plan Deck
              </button>

              <button
                id="tab-storyboard"
                onClick={() => setLabTab('storyboard')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wider flex items-center gap-1.5 ${
                  labTab === 'storyboard' 
                    ? 'bg-amber-50 text-amber-800 font-bold border-b-2 border-amber-500' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Compass className="w-3.5 h-3.5" /> Storyboard
              </button>

              <button
                id="tab-prompts"
                onClick={() => setLabTab('prompts')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wider flex items-center gap-1.5 ${
                  labTab === 'prompts' 
                    ? 'bg-amber-50 text-amber-800 font-bold border-b-2 border-amber-500' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" /> Prompts
              </button>
            </div>

            {/* ---------------------------------------------------------
                TAB 1: Companion (Chat & Custom Systems)
               --------------------------------------------------------- */}
            {labTab === 'companion' && (
              <div id="panel-companion" className="flex flex-col gap-4 animate-fade-in">
                
                {/* Advanced Systems Settings Card */}
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xxs font-bold uppercase tracking-wider text-slate-500">Companion Mechanics</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Persona Selector Preset */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Tone Persona</label>
                      <select 
                        id="chat-preset-selector"
                        value={chatPreset} 
                        onChange={(e) => setChatPreset(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 text-xxs font-semibold p-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 tracking-wide"
                      >
                        <option>Creative Brainstormer 💡</option>
                        <option>Meticulous Critic 🔍</option>
                        <option>Senior Code Mentor 💻</option>
                        <option>Socratic Explainer 🎓</option>
                      </select>
                    </div>

                    {/* Temperature Range Slider */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Aura Temp</label>
                        <span className="text-[10px] text-slate-500 font-semibold">{chatTemperature}</span>
                      </div>
                      <input 
                        id="chat-temp-slider"
                        type="range" 
                        min="0.1" 
                        max="1.0" 
                        step="0.1" 
                        value={chatTemperature} 
                        onChange={(e) => setChatTemperature(parseFloat(e.target.value))}
                        className="w-full accent-amber-500 h-1 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Persona description rule */}
                  <div className="bg-amber-50/40 p-2 rounded-lg border border-amber-100/40 text-[10px] leading-relaxed text-slate-500 font-medium italic">
                    "{presetInstructions[chatPreset]}"
                  </div>
                </div>

                {/* Main Conversational Feed Area */}
                <div id="chat-scroller" className="border border-slate-100 rounded-xl max-h-[290px] min-h-[200px] overflow-y-auto p-3 flex flex-col gap-3 bg-slate-50/30">
                  {chatMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end bg-amber-500/10 border border-amber-200/50 text-slate-800 rounded-2xl rounded-tr-none px-3.5 py-2.5' : 'self-start bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-tl-none px-3.5 py-2.5 shadow-xs'}`}
                    >
                      {msg.presetName && msg.role === 'model' && (
                        <span className="text-[9px] font-semibold text-amber-600 tracking-wide uppercase mb-1 flex items-center gap-1 border-b border-amber-50 pb-0.5">
                          🦾 {msg.presetName}
                        </span>
                      )}
                      <p className="text-xs leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
                      <span className="text-[8px] text-slate-400 font-semibold self-end mt-1">{msg.timestamp}</span>
                    </div>
                  ))}
                  
                  {chatLoading && (
                    <div className="self-start flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-100 rounded-xl shadow-xxs animate-pulse">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce delay-75"></span>
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce delay-150"></span>
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce delay-300"></span>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Send interface */}
                <div className="flex gap-2">
                  <input
                    id="chat-input"
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    placeholder="Ask companion to audit, analyze, review..."
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    id="chat-send-btn"
                    onClick={() => handleSendChat()}
                    disabled={chatLoading || !chatInput.trim()}
                    className="px-3 py-2 bg-slate-900 border border-slate-800 text-slate-50 hover:bg-slate-800 text-xs font-semibold rounded-lg shadow-sm"
                  >
                    Send
                  </button>
                  <button
                    id="chat-clear-btn"
                    onClick={clearChat}
                    className="p-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 border border-slate-200 rounded-lg"
                    title="Clear Discussion"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------
                TAB 2: Strategic Goal Planner
               --------------------------------------------------------- */}
            {labTab === 'planner' && (
              <div id="panel-planner" className="flex flex-col gap-4 animate-fade-in">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-slate-400 pb-0.5">Core Objective Goal</label>
                  <div className="flex gap-2">
                    <input
                      id="planner-goal-input"
                      type="text"
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      placeholder="e.g. Train for Half-Marathon in 8 Weeks..."
                      className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      id="planner-generate-btn"
                      onClick={handleGeneratePlan}
                      disabled={plannerLoading}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1"
                    >
                      {plannerLoading ? 'Structuring...' : 'Generate Plan'}
                    </button>
                  </div>
                </div>

                {/* Execution Loading Indicator */}
                {plannerLoading && (
                  <div id="planner-loading-screen" className="flex flex-col items-center justify-center py-8 gap-2 bg-amber-50/20 border border-amber-100 rounded-xl animate-pulse">
                    <Cpu className="w-5 h-5 text-amber-500 animate-spin" />
                    <span className="text-xxs font-bold text-amber-800 uppercase tracking-widest">Compiling strategic checkpoints...</span>
                  </div>
                )}

                {/* Structured Milestone Progress checklist */}
                {activePlan && !plannerLoading && (
                  <div id="planner-board" className="border border-slate-100 rounded-xl p-4 bg-slate-50/30 flex flex-col gap-4 transition-all">
                    
                    {/* Header Goal details */}
                    <div className="border-b border-slate-100 pb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-sm font-bold text-slate-900">{activePlan.title}</h3>
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-bold rounded-full uppercase tracking-wide">
                          ⏱️ {activePlan.timeline}
                        </span>
                      </div>
                      <p className="text-xxs text-slate-500 leading-relaxed font-medium">{activePlan.description}</p>
                    </div>

                    {/* Completion Tracker ratio bar */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Completion Ratio</span>
                        <span className="text-[10px] font-bold text-amber-600">{getCompletedPercentage()}% ({checkedTasks.length} / {getTotalTasksCount()})</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          id="progress-indicator-bar"
                          className="bg-amber-500 h-1.5 rounded-full transition-all duration-300" 
                          style={{ width: `${getCompletedPercentage()}%` }}
                        />
                      </div>
                    </div>

                    {/* Milestones Sections */}
                    <div className="flex flex-col gap-4 max-h-[220px] overflow-y-auto pr-1">
                      {activePlan.milestones.map((m, mIdx) => (
                        <div key={mIdx} className="bg-white border border-slate-100/80 rounded-lg p-3 shadow-xxs">
                          <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Phase {m.phase || mIdx + 1}</span>
                          <h4 className="text-xs font-bold text-slate-800 mb-2">{m.title}</h4>
                          
                          {/* Inner task checkboxes list */}
                          <div className="flex flex-col gap-2">
                            {m.tasks.map((task, tIdx) => {
                              const isChecked = checkedTasks.includes(task);
                              return (
                                <label 
                                  key={tIdx} 
                                  className={`flex items-start gap-2.5 px-2 py-1.5 rounded-md hover:bg-slate-50 text-[11px] font-medium leading-normal cursor-pointer transition-colors ${
                                    isChecked ? 'text-slate-400 line-through' : 'text-slate-700'
                                  }`}
                                >
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    onChange={() => toggleTask(task)}
                                    className="w-3.5 h-3.5 mt-0.5 accent-amber-500 cursor-pointer text-white border-slate-300 rounded"
                                  />
                                  <span>{task}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Export / Load milestones back into main editor */}
                    <button
                      id="planner-export-btn"
                      onClick={() => {
                        let text = `# Milestones: ${activePlan.title}\n\nObjective: ${activePlan.description}\nSuggested Timeline: ${activePlan.timeline}\n\n`;
                        activePlan.milestones.forEach(m => {
                          text += `## Phase: ${m.title}\n`;
                          m.tasks.forEach(t => {
                            text += `[ ] ${t}\n`;
                          });
                          text += `\n`;
                        });
                        setSelectionResult(text);
                        setLastAction('project_plan_export');
                        showToast('Milestones loaded. See editorial workspace draft!', 'info');
                      }}
                      className="py-1.5 bg-slate-900 text-slate-50 hover:bg-slate-800 text-xxs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1 uppercase tracking-wider"
                    >
                      Export Milestones to Editorial Workspace
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ---------------------------------------------------------
                TAB 3: Narrative Video/Storyboard
               --------------------------------------------------------- */}
            {labTab === 'storyboard' && (
              <div id="panel-storyboard" className="flex flex-col gap-4 animate-fade-in">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-slate-400 pb-0.5">Narrative Screenplay Script</label>
                  <textarea
                    id="storyboard-textarea"
                    value={scriptInput}
                    onChange={(e) => setScriptInput(e.target.value)}
                    placeholder="Describe scene steps, key story visual arcs, or screenplay steps..."
                    className="w-full min-h-[90px] max-h-[140px] p-3 text-xs text-slate-700 bg-slate-50/50 rounded-lg border border-slate-200/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                  />
                  <button
                    id="storyboard-generate-btn"
                    onClick={handleGenerateStoryboard}
                    disabled={storyboardLoading}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {storyboardLoading ? 'Conceptualizing...' : 'Build Storyboard'}
                  </button>
                </div>

                {/* Narrative Loading screen */}
                {storyboardLoading && (
                  <div id="storyboard-loading-screen" className="flex flex-col items-center justify-center py-8 gap-2 bg-amber-50/20 border border-amber-100 rounded-xl animate-pulse">
                    <Cpu className="w-5 h-5 text-amber-500 animate-spin" />
                    <span className="text-xxs font-bold text-amber-800 uppercase tracking-widest">Designing cinematic scenes...</span>
                  </div>
                )}

                {/* Frame Deck Scroll cards design */}
                {storyboard && !storyboardLoading && (
                  <div id="storyboard-deck" className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/30 flex flex-col gap-4">
                    <div className="border-b border-slate-100 pb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cinematic Concept Concept</span>
                      <h3 className="text-xs font-bold text-slate-900">{storyboard.storyTitle}</h3>
                    </div>

                    {/* Cards grid scroll vertical */}
                    <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                      {storyboard.scenes.map((scene) => (
                        <div key={scene.sceneNumber} className="bg-white border border-slate-100 rounded-lg p-3 shadow-xxs">
                          <div className="flex items-center justify-between gap-1.5 mb-1.5">
                            <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black rounded-md">
                              FRAME {scene.sceneNumber}
                            </span>
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[9px] font-bold rounded-md uppercase tracking-wider border border-amber-100 flex items-center gap-1">
                              🎨 {scene.mood || 'Warm Cinematic'}
                            </span>
                          </div>

                          <div className="bg-slate-50 p-2 rounded-md border border-slate-100 mb-2 font-mono text-[9px] leading-relaxed text-slate-500 relative select-all hover:bg-amber-50/30 transition-colors">
                            <span className="font-bold text-[8px] text-amber-700 block mb-0.5">IMAGE COMPOSITION PROMPT:</span>
                            {scene.visualPrompt}
                            <button
                              id={`storyboard-prompt-copy-btn-${scene.sceneNumber}`}
                              onClick={() => copyToClipboard(scene.visualPrompt)}
                              className="absolute top-1.5 right-1.5 p-1 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded"
                              title="Copy Frame Prompt"
                            >
                              <Clipboard className="w-3 h-3" />
                            </button>
                          </div>

                          <p className="text-xxs text-slate-700 italic font-medium">"{scene.caption}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ---------------------------------------------------------
                TAB 4: Curated Prompt Deck
               --------------------------------------------------------- */}
            {labTab === 'prompts' && (
              <div id="panel-prompts" className="flex flex-col gap-3 animate-fade-in pr-1">
                <span className="text-xxs font-bold uppercase tracking-wider text-slate-400">Curated Creative Prompts</span>
                
                <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto">
                  {curatedPrompts.map((p, idx) => (
                    <div key={idx} className="bg-slate-50 hover:bg-orange-50/30 border border-slate-100 rounded-xl p-3 flex flex-col gap-1.5 transition-all">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800">{p.title}</h4>
                        <button
                          id={`prompts-apply-btn-${idx}`}
                          onClick={() => handleApplyPreset(p.text)}
                          className="px-2 py-1 bg-white border border-slate-200 hover:border-amber-400 text-slate-700 text-[10px] font-bold uppercase rounded-md shadow-xxs cursor-pointer flex items-center gap-0.5 transition-all"
                        >
                          Send to Copilot <CornerDownLeft className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <p className="text-[10px] leading-normal text-slate-500 font-medium">{p.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </section>

      </main>

      {/* -------------------------------------------------------------
          Footer credits & meta
      ------------------------------------------------------------- */}
      <footer id="footer-credits" className="bg-white border-t border-slate-100 py-4 px-6 mt-12 text-center text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
        © AI Lab & Workspace Platform • Boundless intelligence and design.
      </footer>

    </div>
  );
}
