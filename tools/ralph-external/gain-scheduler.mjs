/**
 * Gain Scheduler for PID Control System
 *
 * Provides adaptive gain profiles based on task complexity,
 * iteration phase, and observed behavior patterns.
 *
 * @implements Issue #23 - PID-inspired Control Feedback Loop
 * @references REF-015 Self-Refine, REF-021 Reflexion
 *
 * Gain Profiles:
 * - Conservative: For high-risk tasks, slow but stable
 * - Standard: Balanced approach for typical tasks
 * - Aggressive: For simple tasks, fast convergence
 * - Recovery: When stuck or regressing, changes strategy
 */

/**
 * @typedef {Object} GainProfile
 * @property {string} name - Profile name
 * @property {number} kp - Proportional gain
 * @property {number} ki - Integral gain
 * @property {number} kd - Derivative gain
 * @property {string} description - When to use this profile
 */

/**
 * @typedef {Object} TaskComplexityFactors
 * @property {number} estimatedIterations - Expected iterations to complete
 * @property {number} filesAffected - Number of files likely to be modified
 * @property {boolean} hasTests - Whether tests exist/are expected
 * @property {boolean} securitySensitive - Security-critical task
 * @property {boolean} breakingChanges - May cause breaking changes
 * @property {string} domainComplexity - 'low' | 'medium' | 'high'
 */

/**
 * Predefined gain profiles
 */
export const GAIN_PROFILES = {
  /**
   * Conservative: For high-risk, security-sensitive, or breaking changes
   * - Low Kp: Small corrections to avoid overshooting
   * - Low Ki: Slow accumulation prevents drastic changes
   * - High Kd: Strong damping to prevent oscillation
   */
  conservative: {
    name: 'conservative',
    kp: 0.3,
    ki: 0.05,
    kd: 0.4,
    description: 'High-risk tasks: security, breaking changes, compliance',
  },

  /**
   * Standard: Balanced approach for typical development tasks
   * - Moderate Kp: Reasonable response to error
   * - Moderate Ki: Steady progress accumulation
   * - Moderate Kd: Some damping for stability
   */
  standard: {
    name: 'standard',
    kp: 0.5,
    ki: 0.15,
    kd: 0.25,
    description: 'Typical development tasks with moderate complexity',
  },

  /**
   * Aggressive: For simple tasks where fast convergence is desired
   * - High Kp: Strong response to completion gap
   * - High Ki: Quick accumulation for persistent issues
   * - Low Kd: Less damping allows faster movement
   */
  aggressive: {
    name: 'aggressive',
    kp: 0.8,
    ki: 0.25,
    kd: 0.1,
    description: 'Simple tasks: documentation, config, straightforward fixes',
  },

  /**
   * Recovery: When system is stuck or regressing
   * - Very High Kp: Strong push to escape local minimum
   * - Very High Ki: Break through persistent blockers
   * - Negative Kd: Actually accelerate change when stuck
   */
  recovery: {
    name: 'recovery',
    kp: 1.0,
    ki: 0.4,
    kd: -0.1,
    description: 'Stuck or regressing: needs strategy change',
  },

  /**
   * Cautious: For tasks near completion
   * - Low Kp: Gentle corrections
   * - Very Low Ki: Prevent overshoot from accumulation
   * - Very High Kd: Strong damping for precise landing
   */
  cautious: {
    name: 'cautious',
    kp: 0.2,
    ki: 0.02,
    kd: 0.5,
    description: 'Near completion: fine-tuning phase',
  },
};

export class GainScheduler {
  /**
   * @param {Object} options
   * @param {GainProfile} [options.initialProfile] - Starting profile
   * @param {boolean} [options.adaptiveEnabled=true] - Enable adaptive scheduling
   * @param {number} [options.transitionSmoothing=0.3] - Smoothing factor for transitions
   */
  constructor(options = {}) {
    this.currentProfile = options.initialProfile || GAIN_PROFILES.standard;
    this.adaptiveEnabled = options.adaptiveEnabled !== false;
    this.transitionSmoothing = options.transitionSmoothing || 0.3;

    // Track profile history for analysis
    this.profileHistory = [];

    // Current interpolated gains (for smooth transitions)
    this.effectiveGains = { ...this.currentProfile };

    // Task complexity assessment
    this.taskComplexity = null;
  }

  /**
   * Assess task complexity and select initial profile
   * @param {TaskComplexityFactors} factors
   * @returns {GainProfile}
   */
  assessTaskComplexity(factors) {
    this.taskComplexity = factors;

    let complexityScore = 0;

    // Estimated iterations (more = more complex)
    if (factors.estimatedIterations > 10) {
      complexityScore += 2;
    } else if (factors.estimatedIterations > 5) {
      complexityScore += 1;
    }

    // Files affected
    if (factors.filesAffected > 20) {
      complexityScore += 2;
    } else if (factors.filesAffected > 5) {
      complexityScore += 1;
    }

    // Risk factors
    if (factors.securitySensitive) {
      complexityScore += 3;
    }
    if (factors.breakingChanges) {
      complexityScore += 2;
    }

    // Domain complexity
    if (factors.domainComplexity === 'high') {
      complexityScore += 2;
    } else if (factors.domainComplexity === 'medium') {
      complexityScore += 1;
    }

    // Select profile based on score
    let profile;
    if (complexityScore >= 6 || factors.securitySensitive) {
      profile = GAIN_PROFILES.conservative;
    } else if (complexityScore >= 3) {
      profile = GAIN_PROFILES.standard;
    } else {
      profile = GAIN_PROFILES.aggressive;
    }

    this.setProfile(profile, 'initial_assessment');
    return profile;
  }

  /**
   * Set the current gain profile
   * @param {GainProfile} profile
   * @param {string} [reason] - Why the profile changed
   */
  setProfile(profile, reason = 'manual') {
    this.currentProfile = profile;
    // Also update effectiveGains for immediate effect
    this.effectiveGains = { ...profile };

    this.profileHistory.push({
      profile: profile.name,
      reason,
      timestamp: Date.now(),
    });

    // Keep history bounded
    if (this.profileHistory.length > 50) {
      this.profileHistory = this.profileHistory.slice(-50);
    }
  }

  /**
   * Get current effective gains (with smoothing applied)
   * @returns {GainProfile}
   */
  getEffectiveGains() {
    return this.effectiveGains;
  }

  /**
   * Update gains based on current system state
   * @param {Object} state
   * @param {number} state.proportional - Current P error
   * @param {number} state.integral - Current I accumulation
   * @param {number} state.derivative - Current D rate
   * @param {string} state.trend - 'improving' | 'stable' | 'regressing' | 'oscillating'
   * @param {number} state.iterationNumber - Current iteration
   * @param {number} state.maxIterations - Maximum iterations
   * @returns {GainProfile}
   */
  update(state) {
    if (!this.adaptiveEnabled) {
      this.effectiveGains = { ...this.currentProfile };
      return this.currentProfile;
    }

    // Phase-based adjustment
    const progress = state.iterationNumber / state.maxIterations;
    let targetProfile = this.currentProfile;

    // Check for recovery condition
    if (this.needsRecovery(state)) {
      targetProfile = GAIN_PROFILES.recovery;
      this.setProfile(targetProfile, 'recovery_triggered');
    }
    // Check if near completion
    else if (state.proportional < 0.15 && progress > 0.5) {
      targetProfile = GAIN_PROFILES.cautious;
      if (this.currentProfile.name !== 'cautious') {
        this.setProfile(targetProfile, 'near_completion');
      }
    }
    // Check for oscillation
    else if (state.trend === 'oscillating') {
      // Increase damping
      targetProfile = this.createDampedProfile();
      this.setProfile(targetProfile, 'oscillation_damping');
    }
    // Check for regression
    else if (state.trend === 'regressing' && state.derivative > 0.1) {
      targetProfile = GAIN_PROFILES.conservative;
      if (this.currentProfile.name !== 'conservative') {
        this.setProfile(targetProfile, 'regression_detected');
      }
    }

    // Apply smooth transition to target profile
    this.effectiveGains = this.smoothTransition(
      this.effectiveGains,
      targetProfile
    );

    return this.effectiveGains;
  }

  /**
   * Check if system needs recovery mode
   * @param {Object} state
   * @returns {boolean}
   */
  needsRecovery(state) {
    // Stuck: high error with no progress for multiple iterations
    const stuck = state.proportional > 0.7 &&
                  Math.abs(state.derivative) < 0.02 &&
                  state.iterationNumber > 3;

    // Regressing significantly
    const regressing = state.derivative > 0.15;

    // Integral windup (persistent errors)
    const windingUp = state.integral > 3.0;

    return stuck || regressing || windingUp;
  }

  /**
   * Create a damped profile to reduce oscillation
   * @returns {GainProfile}
   */
  createDampedProfile() {
    return {
      name: 'damped',
      kp: this.currentProfile.kp * 0.7,
      ki: this.currentProfile.ki * 0.5,
      kd: Math.min(this.currentProfile.kd * 1.5, 0.6),
      description: 'Dynamically damped to reduce oscillation',
    };
  }

  /**
   * Smooth transition between profiles
   * @param {GainProfile} current
   * @param {GainProfile} target
   * @returns {GainProfile}
   */
  smoothTransition(current, target) {
    const alpha = this.transitionSmoothing;

    return {
      name: target.name,
      kp: current.kp + alpha * (target.kp - current.kp),
      ki: current.ki + alpha * (target.ki - current.ki),
      kd: current.kd + alpha * (target.kd - current.kd),
      description: target.description,
    };
  }

  /**
   * Calculate control output from PID metrics
   * @param {Object} metrics - PID metrics from collector
   * @returns {Object} - Control signals
   */
  calculateControlOutput(metrics) {
    const gains = this.effectiveGains;

    // PID control equation
    const pTerm = gains.kp * metrics.proportional;
    const iTerm = gains.ki * metrics.integral;
    const dTerm = gains.kd * metrics.derivative;

    const controlSignal = pTerm + iTerm + dTerm;

    // Interpret control signal as adjustment recommendations
    return {
      controlSignal,
      pTerm,
      iTerm,
      dTerm,
      recommendations: this.interpretControlSignal(controlSignal, metrics),
    };
  }

  /**
   * Interpret control signal into actionable recommendations
   * @param {number} signal
   * @param {Object} metrics
   * @returns {Object}
   */
  interpretControlSignal(signal, metrics) {
    const recommendations = {
      urgency: 'normal',
      adjustBudget: false,
      adjustTimeout: false,
      changeStrategy: false,
      escalate: false,
      message: '',
    };

    // High control signal = urgent action needed
    if (signal > 0.8) {
      recommendations.urgency = 'critical';
      recommendations.changeStrategy = true;
      recommendations.message = 'Task significantly behind - consider strategy change';
    } else if (signal > 0.5) {
      recommendations.urgency = 'high';
      recommendations.adjustBudget = true;
      recommendations.message = 'Task behind schedule - may need more resources';
    } else if (signal > 0.3) {
      recommendations.urgency = 'elevated';
      recommendations.message = 'Task progressing slowly - monitor closely';
    } else if (signal < 0.1) {
      recommendations.urgency = 'low';
      recommendations.message = 'Task on track - continue current approach';
    }

    // Specific recommendations based on PID components
    if (metrics.integral > 2.0) {
      recommendations.escalate = true;
      recommendations.message += '; Persistent issues detected - may need human review';
    }

    if (metrics.derivative > 0.1) {
      recommendations.adjustTimeout = true;
      recommendations.message += '; Progress slowing - consider extending timeout';
    }

    return recommendations;
  }

  /**
   * Get a profile by name
   * @param {string} name
   * @returns {GainProfile|null}
   */
  getProfileByName(name) {
    return GAIN_PROFILES[name] || null;
  }

  /**
   * Get all available profiles
   * @returns {Object<string, GainProfile>}
   */
  getAllProfiles() {
    return { ...GAIN_PROFILES };
  }

  /**
   * Get profile history
   * @returns {Array}
   */
  getProfileHistory() {
    return [...this.profileHistory];
  }

  /**
   * Reset scheduler state
   */
  reset() {
    this.currentProfile = GAIN_PROFILES.standard;
    this.effectiveGains = { ...this.currentProfile };
    this.profileHistory = [];
    this.taskComplexity = null;
  }

  /**
   * Export state for persistence
   * @returns {Object}
   */
  exportState() {
    return {
      currentProfile: this.currentProfile.name,
      effectiveGains: this.effectiveGains,
      profileHistory: this.profileHistory,
      taskComplexity: this.taskComplexity,
      adaptiveEnabled: this.adaptiveEnabled,
      transitionSmoothing: this.transitionSmoothing,
    };
  }

  /**
   * Import state from persistence
   * @param {Object} state
   */
  importState(state) {
    if (state.currentProfile) {
      this.currentProfile = GAIN_PROFILES[state.currentProfile] || GAIN_PROFILES.standard;
    }
    if (state.effectiveGains) {
      this.effectiveGains = state.effectiveGains;
    }
    if (state.profileHistory) {
      this.profileHistory = state.profileHistory;
    }
    if (state.taskComplexity) {
      this.taskComplexity = state.taskComplexity;
    }
  }
}

export default GainScheduler;
