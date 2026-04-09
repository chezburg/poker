
function calculatePots(lobby) {
  const contributors = Object.keys(lobby.contributions).filter(id => lobby.contributions[id] > 0);
  if (contributors.length === 0) {
    return [];
  }
  const levels = Array.from(new Set(contributors.map(id => lobby.contributions[id]))).sort((a, b) => a - b);
  const pots = [];
  let prevLevel = 0;
  for (const level of levels) {
    const incrementalAmount = level - prevLevel;
    const eligible = contributors.filter(id => lobby.contributions[id] >= level);
    pots.push({
      amount: eligible.length * incrementalAmount,
      eligible
    });
    prevLevel = level;
  }
  return pots;
}

// Test case 1: Simple pot
let lobby1 = { contributions: { "A": 100, "B": 100, "C": 100 } };
console.log("Test 1 (All equal):", JSON.stringify(calculatePots(lobby1)));

// Test case 2: One all-in
let lobby2 = { contributions: { "A": 50, "B": 100, "C": 100 } };
console.log("Test 2 (A all-in 50):", JSON.stringify(calculatePots(lobby2)));

// Test case 3: Multiple all-ins
let lobby3 = { contributions: { "A": 20, "B": 50, "C": 100, "D": 100 } };
console.log("Test 3 (A=20, B=50, C=100, D=100):", JSON.stringify(calculatePots(lobby3)));

// Test case 4: Fold simulation (A folds after putting in 50)
// In my implementation, fold removes ID from eligibility but contributions stay if they put money in.
// Actually, I chose to delete from contributions AND filter eligibility.
function simulateFold(lobby, foldId) {
    // This mimics my server/index.js logic for fold
    let pots = calculatePots(lobby);
    pots.forEach(p => p.eligible = p.eligible.filter(id => id !== foldId));
    return pots;
}
console.log("Test 4 (A folds 50):", JSON.stringify(simulateFold({ contributions: { "A": 50, "B": 100, "C": 100 } }, "A")));
