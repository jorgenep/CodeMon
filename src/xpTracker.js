const vscode = require('vscode');

function initializeXPTracker(context, onXPEarned) {
    // Track user activity patterns for anti-cheat detection
    const activityTracker = {
        lastEditTime: 0,
        lastXPTime: 0,
        editCount: 0,
        errorFixHistory: [], // Track recent error fixes to detect cycling
        suspiciousPatterns: 0,
        fileEditCounts: {}, // Track edits per file
        editTimestamps: [], // Track timing of edits for velocity analysis
        errorTypeFrequency: {}, // Track which error types are being fixed
        codeChangePatterns: [], // Track code changes for logical coherence
        trustScore: 100, // Starts at 100, decreases with suspicious activity
        cheatAttempts: 0, // Counter for detected cheat attempts
    };

    const config = {
        // XP Rewards
        bugFixXP: 10, // XP for fixing a bug
        consistentCodingXP: 2, // Small XP for consistent programming
        fileSaveXP: 2, // XP for saving a file
        
        // Thresholds and cooldowns
        codingActivityCooldown: 5000, // 5 seconds between consistent coding XP awards
        
        // Anti-cheat thresholds
        trustScoreThreshold: 60, // Below this, no XP awarded
        minFixTime: 500, // Minimum milliseconds to fix an error (too fast = suspicious)
        maxFixTime: 60000, // Maximum reasonable time to fix (in milliseconds)
        maxErrorsPerMinute: 15, // Detect if creating errors too fast
        cycleLookbackWindow: 60000, // 60 second lookback for patterns
        editVelocityThreshold: 100, // Min milliseconds between edits (too fast = bot-like)
        errorRepeatThreshold: 4, // Same error fixed 4+ times = suspicious
        
        // Edit tracking
        minEditsForXP: 3, // Minimum edits in cooldown period to award XP
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
     * Award XP for bug fixes with anti-cheat validation
     */
    function awardBugFixXP(analysis) {
        // Check trust score first
        if (activityTracker.trustScore < config.trustScoreThreshold) {
            onXPEarned(0, 'bug_fix_flagged');
            return;
        }
        
        // Calculate XP multiplier based on cheat probability
        const cheatProb = analysis.cheatProbability;
        let xpMultiplier = 1 - cheatProb; // 100% legit = 1x, 50% suspicious = 0.5x
        xpMultiplier = Math.max(0.1, xpMultiplier); // Minimum 10% XP for questionable fixes
        
        const xpAwarded = Math.floor(config.bugFixXP * xpMultiplier);
        const xpType = analysis.isCheating ? 'bug_fix_suspicious' : 'bug_fix';
        
        if (analysis.isCheating) {
            onXPEarned(xpAwarded, xpType, {
                trustScore: activityTracker.trustScore,
                suspicionScore: analysis.suspicionScore,
                factors: analysis.factors,
            });
        } else {
            onXPEarned(xpAwarded, xpType);
        }
    }

    /**
     * Award XP for consistent coding activity
     */
    function awardConsistentCodingXP() {
        const now = Date.now();
        
        // Check if enough time has passed since last XP award
        if (now - activityTracker.lastXPTime < config.codingActivityCooldown) {
            return;
        }
        
        // Check if there have been enough edits
        if (activityTracker.editCount >= config.minEditsForXP) {
            onXPEarned(config.consistentCodingXP, 'consistent_coding');
            activityTracker.lastXPTime = now;
            activityTracker.editCount = 0;
        }
    }

    /**
     * Award XP for file saves
     */
    function awardFileSaveXP() {
        onXPEarned(config.fileSaveXP, 'file_save');
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
            // Keep only last 60 seconds of edits
            activityTracker.editTimestamps = activityTracker.editTimestamps.filter(t => now - t < 60000);
            
            // Track edit count
            activityTracker.editCount++;
            
            // Track file-specific edits
            if (!activityTracker.fileEditCounts[uri]) {
                activityTracker.fileEditCounts[uri] = 0;
            }
            activityTracker.fileEditCounts[uri]++;
            
            // Update last edit time
            activityTracker.lastEditTime = now;
            
            // Try to award XP for consistent coding
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
            
            // Run advanced cheat detection analysis
            const analysis = detectCheating(errorsBefore, errorsAfter, previousErrorLocations, file, previousDiagnostics);
            
            // Award XP (amount depends on cheating analysis)
            awardBugFixXP(analysis);
        }
        // Detect if errors are being artificially created
        else if (currentErrorCount > previousErrorCount) {
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
            trustScore: activityTracker.trustScore,
            cheatAttempts: activityTracker.cheatAttempts,
            suspiciousPatterns: activityTracker.suspiciousPatterns,
            fileEditCounts: activityTracker.fileEditCounts,
            errorFixCount: activityTracker.errorFixHistory.length,
        }),
        getDetailedAnalysis: () => ({
            trustScore: activityTracker.trustScore,
            cheatAttempts: activityTracker.cheatAttempts,
            recentHistory: activityTracker.errorFixHistory.slice(-10),
            errorTypeFrequency: activityTracker.errorTypeFrequency,
        }),
        resetActivityStats: () => {
            activityTracker.editCount = 0;
            activityTracker.fileEditCounts = {};
            activityTracker.editTimestamps = [];
        },
    };
}

module.exports = { initializeXPTracker };