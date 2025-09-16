# Gift Stacking Implementation Plan

## Overview
Currently, when multiple gifts of the same type are received (e.g., 5 roses), the system processes each gift individually, triggering the mapped key action once per gift. The proposed enhancement will implement **gift stacking** where multiple instances of the same gift are accumulated and the key action is triggered multiple times in sequence.

## Current Behavior
- Each gift triggers `handleGiftByName()` individually
- Multiple gifts of the same type result in multiple separate key presses
- No accumulation or batching mechanism exists
- Frontend shows aggregated counts in the feed, but backend processes each gift separately

## Proposed Behavior
- When the same gift is received multiple times within a stacking window, accumulate the count
- After the stacking window expires, trigger the key action N times (once per accumulated gift)
- Provide visual feedback in the UI showing stacking progress
- Allow users to configure stacking behavior per gift mapping

## Implementation Phases

### Phase 1: Backend Gift Stacking Engine

#### 1.1 Stacking State Management
**Location**: `backend/index.js`

**Changes**:
- Add new global variables for stacking state:
  ```javascript
  // Gift stacking configuration
  const GIFT_STACKING_WINDOW_MS = 2000; // 2 seconds to accumulate gifts
  let giftStackingEnabled = true; // Global toggle

  // Stacking state: { [giftNameLower]: { count, lastReceived, timeoutId } }
  let giftStacks = {};
  ```

**New Functions**:
- `startGiftStack(giftNameLower, count)` - Initialize or update stacking for a gift
- `processGiftStack(giftNameLower)` - Process accumulated gifts and trigger actions
- `clearGiftStack(giftNameLower)` - Clean up expired stacks

#### 1.2 Modified Gift Processing
**Location**: `backend/index.js` - `handleGiftByName()` function

**Changes**:
- Replace immediate key triggering with stacking logic
- Add stacking configuration per gift mapping

**New Gift Mapping Structure**:
```javascript
// Enhanced mapping structure
let giftToAction = {
  'rose': {
    key: 'w',
    durationSec: 1.0,
    cooldownMs: 0,
    stacking: {
      enabled: true,
      windowMs: 2000, // Override global stacking window
      maxStack: 10,    // Maximum gifts to stack (0 = unlimited)
      mode: 'sequential' // 'sequential' or 'batch'
    }
  }
};
```

#### 1.3 Stacking Modes
- **Sequential Mode**: Press key → wait → press key → wait (respects individual key timing)
- **Batch Mode**: Send all key presses in rapid succession (for games that handle rapid input)

### Phase 2: Frontend Configuration

#### 2.1 Enhanced Gift Mapping Modal
**Location**: `frontend/src/components/GiftMappingModal.jsx`

**New Features**:
- Advanced options section for stacking configuration
- Toggle to enable/disable stacking per gift
- Configuration for stacking window duration
- Configuration for maximum stack size
- Selection between sequential vs batch mode

#### 2.2 Gift Mapping Table Updates
**Location**: `frontend/src/components/GiftMappingTable.jsx`

**Changes**:
- Add stacking indicators in the table
- Show stacking configuration in mapping details
- Add bulk actions for stacking settings

### Phase 3: Visual Feedback System

#### 3.1 Stacking Progress Indicators
**Location**: `frontend/src/components/LiveFeedSection.jsx`

**New Features**:
- Visual stacking progress bars for active stacks
- Real-time count updates showing accumulated gifts
- Color-coded stacking states (accumulating, processing, complete)
- Stacking notifications/toasts

#### 3.2 Real-time Stacking Updates
**WebSocket Communication**:
- New message type: `'gift-stack-update'`
- Payload: `{ giftName, currentCount, maxStack, timeRemaining }`
- Update stacking UI in real-time

### Phase 4: Advanced Features

#### 4.1 Stacking Analytics
- Track stacking effectiveness metrics
- Show stacking statistics in the UI
- Historical stacking data for optimization

#### 4.2 Dynamic Stacking Windows
- Adaptive stacking windows based on gift frequency
- Learning algorithm to optimize stacking windows per gift type

#### 4.3 Emergency Stack Processing
- Manual trigger to process stacks immediately
- Emergency stop functionality for active stacks

## Technical Considerations

### Performance Impact
- **Memory**: Minimal - only active stacks are stored
- **CPU**: Low - simple timeout and counter operations
- **Network**: Minimal additional WebSocket traffic

### Backward Compatibility
- Existing gift mappings continue to work without stacking
- New stacking features are opt-in per gift
- Default behavior remains unchanged for non-stacking gifts

### Error Handling
- Graceful fallback to individual processing if stacking fails
- Clear error messages for stacking configuration issues
- Recovery mechanisms for interrupted stacks

## Testing Strategy

### Unit Tests
- Test stacking window expiration logic
- Test stack accumulation and processing
- Test different stacking modes
- Test edge cases (max stack limits, etc.)

### Integration Tests
- End-to-end gift stacking workflow
- WebSocket communication testing
- Frontend-backend synchronization testing

### User Acceptance Testing
- Real TikTok Live gift scenarios
- Different stacking configurations
- Performance testing with high gift volumes

## Migration Plan

### Phase 1 Deployment
1. Deploy backend stacking engine with default disabled
2. Monitor system stability
3. Enable stacking for test gift mappings

### Phase 2 Deployment
1. Deploy frontend configuration UI
2. Enable stacking for select users
3. Gather feedback and iterate

### Full Rollout
1. Enable stacking by default for new mappings
2. Provide migration tools for existing mappings
3. Complete documentation and user guides

## Success Metrics

### Functional Metrics
- Reduction in individual gift processing overhead
- Improved user experience with batch gift handling
- Successful stacking ratio (gifts stacked vs individual)

### Performance Metrics
- Reduced key press frequency for stacked gifts
- Improved system responsiveness during gift storms
- Lower CPU usage during high-volume gift periods

### User Metrics
- User adoption rate of stacking features
- User satisfaction with stacking behavior
- Reduction in manual gift handling requirements

## Risk Assessment

### Low Risk
- Backward compatibility maintained
- Opt-in feature design
- Graceful error handling

### Medium Risk
- Timing-sensitive game interactions
- Complex stacking window calculations
- Real-time UI synchronization

### Mitigation Strategies
- Comprehensive testing with different game types
- User-configurable stacking parameters
- Real-time monitoring and alerting
- Easy disable/enable functionality

## Timeline Estimate

- **Phase 1 (Backend Core)**: 2-3 weeks
- **Phase 2 (Frontend Config)**: 1-2 weeks
- **Phase 3 (Visual Feedback)**: 1-2 weeks
- **Phase 4 (Advanced Features)**: 2-3 weeks
- **Testing & Deployment**: 1-2 weeks

## Conclusion

The gift stacking feature will significantly improve the system's ability to handle multiple gifts efficiently while providing users with fine-grained control over stacking behavior. The implementation maintains backward compatibility and includes comprehensive error handling and monitoring capabilities.
