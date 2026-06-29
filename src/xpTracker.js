const vscode = require('vscode');

function initializeXPTracker(context, onXPEarned) {
    // Track user activity patterns for anti-cheat detection
    const activityTracker = {
        lastEditTime: 0,
        lastXPTime: 0,
        editCount: 0,
        linesChanged: 0,           // Tracks meaningful content added/removed
        errorFixHistory: [], // Track recent error fixes to detect cycling
        suspiciousPatterns: 0,
        fileEditCounts: {}, // Track edits per file
        editTimestamps: [], // Track timing of edits for velocity analysis
        errorTypeFrequency: {}, // Track which error types are being fixed
        codeChangePatterns: [], // Track code changes for logical coherence
        trustScore: 100, // Starts at 100, decreases with suspicious activity
        cheatAttempts: 0, // Counter for detected cheat attempts

        // Combo system
        bugFixCombo: 0,            // Consecutive bug fixes without introducing errors
        lastBugFixTime: 0,         // Timestamp of last bug fix (for combo window)

        // Session bonuses
        sessionStartTime: Date.now(),
        firstXPEarnedToday: false, // Whether the session-first bonus has been used
        lastSaveXPTime: 0,         // For save XP cooldown
    };

    const config = {
        // XP Rewards
        bugFixXP: 10,             // XP per error fixed (multiplied by errorsFixed count)
        consistentCodingXP: 3,    // XP for meaningful coding activity
        fileSaveXP: 2,            // XP for saving a file
        
        // Thresholds and cooldowns
        codingActivityCooldown: 5000,   // 5 seconds between consistent coding XP awards
        fileSaveCooldown: 30000,        // Max one save XP per 30 seconds
        minLinesForXP: 5,               // Minimum net lines changed to award coding XP

        // Combo system
        comboWindow: 30000,       // 30s window to chain bug fixes
        comboMultipliers: [1, 1.25, 1.5, 2, 3], // Index = combo count (capped at last)

        // Session bonuses
        sessionFirstMultiplier: 1.5, // First XP of the session

        // Shiny (rare encounter) system
        shinyChance: 0.02,        // 2% chance of a 3x rare bonus on any XP event
        shinyMultiplier: 3,

        // Anti-cheat thresholds
        trustScoreThreshold: 60,  // Below this, no XP awarded
        minFixTime: 500,          // Minimum milliseconds to fix an error (too fast = suspicious)
        maxFixTime: 60000,        // Maximum reasonable time to fix (in milliseconds)
        maxErrorsPerMinute: 15,   // Detect if creating errors too fast
        cycleLookbackWindow: 60000, // 60 second lookback for patterns
        editVelocityThreshold: 100, // Min milliseconds between edits (too fast = bot-like)
        errorRepeatThreshold: 4,  // Same error fixed 4+ times = suspicious
        
        // Edit tracking
        minEditsForXP: 3,         // Minimum edits in cooldown period to award XP
    };

    /**
     * Advanced Cheat Detection Algorithm using multi-factor analysis
     */
    function analyzeCheatProbability(errorData, recentHistory) {
        let suspicionScore = 0;
        const factors = {};

        // Factor 1: Error Cycling Detection (Same location/type fixed repeatedly)
        const sameLocationCount = recentHistory.filter(e => 
            JSON.stringify(e.locations) === JSON.stringify(errorData.locations) &&
            Date.now() - e.timestamp < config.cycleLookbackWindow
        ).length;
        
        if (sameLocationCount >= config.errorRepeatThreshold) {
            suspicionScore += 40;
            factors.errorCycling = sameLocationCount;
        }

        // Factor 2: Error Type Frequency (Repeatedly fixing same type of error)
        const errorTypesFixed = recentHistory
            .filter(e => Date.now() - e.timestamp < config.cycleLookbackWindow)
            .map(e => e.errorType);
        
        const errorTypeFreq = {};
        errorTypesFixed.forEach(type => {
            errorTypeFreq[type] = (errorTypeFreq[type] || 0) + 1;
        });
        
        const mostCommonErrorCount = Math.max(...Object.values(errorTypeFreq), 0);
        if (mostCommonErrorCount >= config.errorRepeatThreshold * 0.75) {
            suspicionScore += 25;
            factors.errorTypeRepetition = mostCommonErrorCount;
        }

        // Factor 3: Fix Speed Analysis (Too fast = suspicious, too slow = ok)
        const timeSinceLastError = Date.now() - (recentHistory[recentHistory.length - 1]?.timestamp || Date.now());
        if (timeSinceLastError < config.minFixTime && recentHistory.length > 0) {
            suspicionScore += 30;
            factors.fixTooFast = timeSinceLastError;
        }
        if (timeSinceLastError > config.maxFixTime * 2) {
            suspicionScore -= 5; // Reduce suspicion for thoughtful debugging
            factors.thoughtfulFix = true;
        }

        // Factor 4: Error Creation Before Fix Pattern
        if (errorData.errorsCreatedRecently > 0) {
            const recentCreations = recentHistory.filter(e => 
                Date.now() - e.timestamp < 5000 && e.errorsCreated
            ).length;
            
            if (recentCreations > 2) {
                suspicionScore += 35;
                factors.artificialErrorCreation = recentCreations;
            }
        }

        // Factor 5: Multi-file Bouncing (Jumping between files to create/fix errors)
        const recentFiles = recentHistory
            .filter(e => Date.now() - e.timestamp < config.cycleLookbackWindow)
            .map(e => e.file);
        
        const uniqueFiles = new Set(recentFiles).size;
        const fixCount = recentHistory.filter(e => Date.now() - e.timestamp < config.cycleLookbackWindow).length;
        
        if (fixCount > 5 && uniqueFiles === 1) {
            suspicionScore += 20; // All fixes in one file
            factors.singleFileRepeat = fixCount;
        }
        if (fixCount > 8 && uniqueFiles > fixCount * 0.7) {
            suspicionScore += 15; // Bouncing between many files
            factors.fileHopping = uniqueFiles;
        }

        // Factor 6: Keystroke Velocity Analysis (Too uniform = bot-like)
        const recentEdits = activityTracker.editTimestamps.filter(t => Date.now() - t < 30000);
        if (recentEdits.length > 10) {
            const intervals = [];
            for (let i = 1; i < recentEdits.length; i++) {
                intervals.push(recentEdits[i] - recentEdits[i - 1]);
            }
            
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
            const stdDev = Math.sqrt(variance);
            
            // Very low variance = suspicious (too consistent)
            if (stdDev < 20) {
                suspicionScore += 25;
                factors.suspiciousKeystrokePattern = { avgInterval, stdDev };
            }
            // Very high variance = ok (natural human typing)
            if (stdDev > 200) {
                suspicionScore -= 10;
            }
        }

        // Factor 7: Error Rate Analysis
        const errorsPerMinute = recentHistory.filter(e => 
            Date.now() - e.timestamp < 60000
        ).length;
        
        if (errorsPerMinute > config.maxErrorsPerMinute) {
            suspicionScore += 30;
            factors.tooManyErrors = errorsPerMinute;
        } else if (errorsPerMinute < 2) {
            suspicionScore -= 5; // Reward low error rate
        }

        // Factor 8: Trust Score Decay (Recent behavior history)
        if (activityTracker.cheatAttempts > 0) {
            suspicionScore += Math.min(activityTracker.cheatAttempts * 10, 30);
            factors.priorCheating = activityTracker.cheatAttempts;
        }

        // Clamp suspicion score and calculate final cheat probability
        suspicionScore = Math.max(0, Math.min(100, suspicionScore));
        
        return {
            cheatProbability: suspicionScore / 100, // 0-1 scale
            suspicionScore,
            factors,
            isCheating: suspicionScore > 50,
        };
    }

    /**
     * Detect if user is creating/fixing errors artificially (cheating) - NEW ALGORITHM
     */
    function detectCheating(errorsBefore, errorsAfter, errorLocations, file, diagnostics) {
        const now = Date.now();
        
        // Extract error information
        const errorType = diagnostics.length > 0 ? diagnostics[0].message : 'unknown';
        const errorsCreated = errorsBefore > errorsAfter ? 0 : (errorsAfter - errorsBefore);
        
        // Add to error fix history
        const errorRecord = {
            timestamp: now,
            errorsFixed: Math.max(0, errorsBefore - errorsAfter),
            errorsCreated,
            locations: errorLocations,
            file,
            errorType,
        };
        
        if (errorsBefore > errorsAfter) {
            activityTracker.errorFixHistory.push(errorRecord);
        }
        
        // Keep rolling history (last 60 seconds)
        activityTracker.errorFixHistory = activityTracker.errorFixHistory.filter(
            entry => now - entry.timestamp < config.cycleLookbackWindow
        );
        
        // Run multi-factor analysis
        const analysis = analyzeCheatProbability(errorRecord, activityTracker.errorFixHistory);
        
        // Update trust score based on analysis
        if (analysis.isCheating) {
            activityTracker.trustScore = Math.max(0, activityTracker.trustScore - (analysis.suspicionScore / 10));
            activityTracker.cheatAttempts++;
        } else {
            activityTracker.trustScore = Math.min(100, activityTracker.trustScore + 2); // Reward legitimate fixes
        }
        
        return analysis;
    }

    /**
     * Apply session-first and shiny bonuses to a base XP value.
     * Returns { finalXP, bonuses } where bonuses lists which triggered.
     */
    function applyBonuses(baseXP) {
        let xp = baseXP;
        const bonuses = [];

        // Session-first bonus (once per session)
        if (!activityTracker.firstXPEarnedToday) {
            xp = Math.floor(xp * config.sessionFirstMultiplier);
            activityTracker.firstXPEarnedToday = true;
            bonuses.push('session_first');
        }

        // Shiny (rare) bonus — checked after session bonus
        if (Math.random() < config.shinyChance) {
            xp = Math.floor(xp * config.shinyMultiplier);
            bonuses.push('shiny');
        }

        return { finalXP: Math.max(1, xp), bonuses };
    }

    /**
     * Award XP for bug fixes with anti-cheat validation
     */
    /**
     * Award XP for bug fixes with anti-cheat validation.
     * Scales with errorsFixed count and active combo.
     */
    function awardBugFixXP(analysis, errorsFixed) {
        // Check trust score first
        if (activityTracker.trustScore < config.trustScoreThreshold) {
            onXPEarned(0, 'bug_fix_flagged');
            return;
        }
        
        const now = Date.now();

        // Update combo: reset if outside window, else increment
        if (now - activityTracker.lastBugFixTime > config.comboWindow) {
            activityTracker.bugFixCombo = 0;
        }
        activityTracker.bugFixCombo++;
        activityTracker.lastBugFixTime = now;

        const comboIndex = Math.min(activityTracker.bugFixCombo - 1, config.comboMultipliers.length - 1);
        const comboMultiplier = config.comboMultipliers[comboIndex];

        // Scale base XP by number of errors actually fixed
        const scaledBase = config.bugFixXP * errorsFixed;

        // Apply anti-cheat multiplier (1.0 = clean, approaches 0 if suspicious)
        const cheatProb = analysis.cheatProbability;
        const cheatMultiplier = Math.max(0.1, 1 - cheatProb);

        const preBonus = Math.floor(scaledBase * comboMultiplier * cheatMultiplier);
        const { finalXP, bonuses } = applyBonuses(preBonus);

        const xpType = analysis.isCheating ? 'bug_fix_suspicious' : 'bug_fix';

        onXPEarned(finalXP, xpType, {
            errorsFixed,
            combo: activityTracker.bugFixCombo,
            comboMultiplier,
            bonuses,
            ...(analysis.isCheating && {
                trustScore: activityTracker.trustScore,
                suspicionScore: analysis.suspicionScore,
                factors: analysis.factors,
            }),
        });
    }

    /**
     * Award XP for consistent coding activity.
     * Gates on meaningful lines changed, not raw edit count.
     */
    function awardConsistentCodingXP() {
        const now = Date.now();
        
        if (now - activityTracker.lastXPTime < config.codingActivityCooldown) return;
        if (activityTracker.editCount < config.minEditsForXP) return;
        if (activityTracker.linesChanged < config.minLinesForXP) return;

        const { finalXP, bonuses } = applyBonuses(config.consistentCodingXP);
        onXPEarned(finalXP, 'consistent_coding', { linesChanged: activityTracker.linesChanged, bonuses });

        activityTracker.lastXPTime = now;
        activityTracker.editCount = 0;
        activityTracker.linesChanged = 0;
    }

    /**
     * Award XP for file saves, with a cooldown to prevent spam.
     */
    function awardFileSaveXP() {
        const now = Date.now();
        if (now - activityTracker.lastSaveXPTime < config.fileSaveCooldown) return;
        activityTracker.lastSaveXPTime = now;

        const { finalXP, bonuses } = applyBonuses(config.fileSaveXP);
        onXPEarned(finalXP, 'file_save', { bonuses });
    }

    /**
     * Track document changes for consistent coding detection
     */
    const documentChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.isDirty) {
            const now = Date.now();
            const uri = event.document.uri.toString();
            
            // Track edit timestamp for velocity analysis
            activityTracker.editTimestamps.push(now);
            activityTracker.editTimestamps = activityTracker.editTimestamps.filter(t => now - t < 60000);
            
            activityTracker.editCount++;

            // Count net lines added/removed across all changes in this event
            for (const change of event.contentChanges) {
                const linesAdded = (change.text.match(/\n/g) || []).length;
                const linesRemoved = change.range.end.line - change.range.start.line;
                activityTracker.linesChanged += Math.abs(linesAdded - linesRemoved) + (linesAdded > 0 ? 1 : 0);
            }

            // Track file-specific edits
            activityTracker.fileEditCounts[uri] = (activityTracker.fileEditCounts[uri] || 0) + 1;
            activityTracker.lastEditTime = now;
            
            awardConsistentCodingXP();
        }
    });

    /**
     * Track file saves
     */
    const fileSaveListener = vscode.workspace.onDidSaveTextDocument((document) => {
        awardFileSaveXP();
    });

    /**
     * Monitor diagnostics for bug fixes
     */
    let previousErrorCount = 0;
    let previousErrorLocations = [];
    let previousDiagnostics = [];

    const diagnosticListener = vscode.languages.onDidChangeDiagnostics((event) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const uri = editor.document.uri;
        const file = uri.toString();
        const diagnostics = vscode.languages.getDiagnostics(uri);
        const currentErrorCount = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
        
        // Get current error locations and types for cheat detection
        const currentErrorLocations = diagnostics
            .filter(d => d.severity === vscode.DiagnosticSeverity.Error)
            .map(d => `${d.range.start.line}:${d.range.start.character}`);
        
        const currentDiagnostics = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);

        // If errors decreased, a bug was fixed!
        if (currentErrorCount < previousErrorCount) {
            const errorsBefore = previousErrorCount;
            const errorsAfter = currentErrorCount;
            const errorsFixed = errorsBefore - errorsAfter;
            
            // Run advanced cheat detection analysis
            const analysis = detectCheating(errorsBefore, errorsAfter, previousErrorLocations, file, previousDiagnostics);
            
            // Award XP scaled to how many errors were actually fixed
            awardBugFixXP(analysis, errorsFixed);
        }
        // Detect if errors are being artificially created — also breaks the combo
        else if (currentErrorCount > previousErrorCount) {
            // Reset combo: introducing errors breaks the streak
            activityTracker.bugFixCombo = 0;

            // User introduced new errors - track but don't penalize yet
            const newErrors = currentErrorCount - previousErrorCount;
            activityTracker.errorFixHistory.push({
                timestamp: Date.now(),
                errorsFixed: 0,
                errorsCreated: newErrors,
                locations: currentErrorLocations,
                file,
                errorType: currentDiagnostics.length > 0 ? currentDiagnostics[0].message : 'unknown',
            });
        }

        previousErrorCount = currentErrorCount;
        previousErrorLocations = currentErrorLocations;
        previousDiagnostics = currentDiagnostics;
    });

    context.subscriptions.push(documentChangeListener, fileSaveListener, diagnosticListener);
    
    // Return tracker for potential debugging/stats display
    return {
        getActivityStats: () => ({
            editCount: activityTracker.editCount,
            linesChanged: activityTracker.linesChanged,
            trustScore: activityTracker.trustScore,
            cheatAttempts: activityTracker.cheatAttempts,
            suspiciousPatterns: activityTracker.suspiciousPatterns,
            fileEditCounts: activityTracker.fileEditCounts,
            errorFixCount: activityTracker.errorFixHistory.length,
            bugFixCombo: activityTracker.bugFixCombo,
        }),
        getDetailedAnalysis: () => ({
            trustScore: activityTracker.trustScore,
            cheatAttempts: activityTracker.cheatAttempts,
            recentHistory: activityTracker.errorFixHistory.slice(-10),
            errorTypeFrequency: activityTracker.errorTypeFrequency,
            bugFixCombo: activityTracker.bugFixCombo,
            comboMultiplier: config.comboMultipliers[
                Math.min(activityTracker.bugFixCombo - 1, config.comboMultipliers.length - 1)
            ] ?? 1,
        }),
        resetActivityStats: () => {
            activityTracker.editCount = 0;
            activityTracker.linesChanged = 0;
            activityTracker.fileEditCounts = {};
            activityTracker.editTimestamps = [];
            activityTracker.bugFixCombo = 0;
        },
    };
}

module.exports = { initializeXPTracker };