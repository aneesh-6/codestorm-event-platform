import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'codestorm-data.json');

/**
 * Generates an unpredictable, cryptographically secure temporary password.
 * Requirements:
 * - Minimum 8 characters (default 10)
 * - Includes uppercase letters
 * - Includes lowercase letters
 * - Includes numbers
 * - Includes safe special characters
 * - Never predictable
 */
export function generateSecureTemporaryPassword(length = 8) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;

  const getRandomChar = (set) => set[crypto.randomInt(0, set.length)];

  // Ensure presence of uppercase, lowercase, and digits
  const pwdChars = [
    getRandomChar(upper),
    getRandomChar(upper),
    getRandomChar(lower),
    getRandomChar(lower),
    getRandomChar(digits),
    getRandomChar(digits),
  ];

  while (pwdChars.length < length) {
    pwdChars.push(getRandomChar(all));
  }

  // Fisher-Yates shuffle with crypto.randomInt
  for (let i = pwdChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [pwdChars[i], pwdChars[j]] = [pwdChars[j], pwdChars[i]];
  }

  return pwdChars.join('');
}

/**
 * Derives the Participant ID from the Registration sequence:
 * CODESTORM-2026-0001 -> CS26-0001
 */
export function generateParticipantId(regId) {
  if (!regId) return `CS26-${String(crypto.randomInt(1001, 9999)).padStart(4, '0')}`;
  const clean = String(regId).trim().toUpperCase();
  const match = clean.match(/^CODESTORM-2026-(\d+)$/i);
  if (match) {
    return `CS26-${match[1]}`;
  }
  return `CS26-${clean.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`;
}

/**
 * Derives deterministic password from Registration sequence:
 * CODESTORM-2026-XXXX -> PASSXXXX (e.g., CODESTORM-2026-9216 -> PASS9216)
 */
export function generateDeterministicPassword(regId) {
  if (!regId) return 'PASS0001';
  const clean = String(regId).trim().toUpperCase();
  const match = clean.match(/^CODESTORM-2026-(\d+)$/i);
  if (match) {
    return `PASS${match[1]}`;
  }
  const digits = clean.replace(/\D/g, '');
  if (digits.length >= 4) {
    return `PASS${digits.slice(-4)}`;
  }
  return `PASS${digits.padStart(4, '0')}`;
}

// Default initial state
function getInitialData() {
  const salt = bcrypt.genSaltSync(10);
  const hash = (pwd) => bcrypt.hashSync(pwd, salt);

  const users = [
    {
      id: 'user-admin-1',
      name: 'ADMIN',
      email: 'admin@codestorm.mrem.ac.in',
      participantId: null,
      passwordHash: hash('admin123'),
      role: 'admin',
      createdAt: '2026-09-20T10:00:00.000Z'
    },
    {
      id: 'user-coord-1',
      name: 'FACULTY COORDINATOR',
      email: 'coordinator@codestorm.mrem.ac.in',
      participantId: null,
      passwordHash: hash('coord123'),
      role: 'coordinator',
      createdAt: '2026-09-20T10:00:00.000Z'
    }
  ];

  const participants = [];

  const rounds = [
    {
      id: 1,
      roundNumber: 1,
      name: 'BUGBUSTER',
      subtitle: 'Code Debugging Championship',
      description: 'Pinpoint and squash hidden syntax, logical, and runtime bugs across C, C++, Java, and Python. Restore proper behavior and beat the test runner.',
      durationMinutes: 30,
      status: 'live', // Default live for instant testing
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      remainingSeconds: 1800,
      isPaused: false
    },
    {
      id: 2,
      roundNumber: 2,
      name: 'TRACE & RACE',
      subtitle: 'Speed Output Prediction & Logic Sprint',
      description: 'Fast-paced mental tracing, pointer arithmetic, bitwise wizardry, and language quirk prediction. Time is of the essence!',
      durationMinutes: 25,
      status: 'upcoming',
      startTime: null,
      endTime: null,
      remainingSeconds: 1500,
      isPaused: false
    },
    {
      id: 3,
      roundNumber: 3,
      name: 'CODE CHALLENGE',
      subtitle: 'Full-Scale Competitive Programming',
      description: 'Design optimal algorithmic solutions to complex computational problems. Pass all strict time, memory, and hidden edge cases.',
      durationMinutes: 45,
      status: 'locked',
      startTime: null,
      endTime: null,
      remainingSeconds: 2700,
      isPaused: false
    }
  ];

  const questions = [
    // --- ROUND 1: BUGBUSTER ---
    {
      id: 'q-bb-1',
      roundId: 1,
      orderIndex: 1,
      type: 'debugging',
      title: 'Off-by-One Array Reversal & Palindrome Checker',
      difficulty: 'Easy',
      points: 50,
      negativePoints: 0,
      description: 'The given function is intended to take an integer array and verify if it is symmetric (a palindrome). However, due to an off-by-one indexing error and improper loop termination, it either causes an IndexError or always returns incorrect results.',
      expectedBehavior: 'Read integer N, followed by N space-separated integers. Print "YES" if the array is a palindrome, or "NO" otherwise.',
      buggyCode: {
        python: `# Buggy Code - Fix the index boundary and condition
def is_palindrome(arr, n):
    for i in range(0, n): # BUG: Iterating all the way and wrong index calculation
        if arr[i] != arr[n - i]: # BUG: Off-by-one index out of bounds!
            return False
    return True

import sys
input_data = sys.stdin.read().split()
if input_data:
    n = int(input_data[0])
    arr = list(map(int, input_data[1:n+1]))
    print("YES" if is_palindrome(arr, n) else "NO")
`,
        cpp: `// Buggy Code - Fix index boundary
#include <iostream>
#include <vector>
using namespace std;

bool isPalindrome(const vector<int>& arr, int n) {
    for (int i = 0; i <= n; i++) { // BUG: i <= n out of bounds
        if (arr[i] != arr[n - i]) { // BUG: arr[n - i] out of bounds when i = 0
            return false;
        }
    }
    return true;
}

int main() {
    int n;
    if (cin >> n) {
        vector<int> arr(n);
        for (int i = 0; i < n; i++) cin >> arr[i];
        cout << (isPalindrome(arr, n) ? "YES" : "NO") << endl;
    }
    return 0;
}
`,
        c: `// Buggy Code - Fix index boundary
#include <stdio.h>
#include <stdbool.h>

bool isPalindrome(int arr[], int n) {
    for (int i = 0; i <= n; i++) { // BUG: out of bounds
        if (arr[i] != arr[n - i]) { // BUG: arr[n-0] accesses index n
            return false;
        }
    }
    return true;
}

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        int arr[1000];
        for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
        printf("%s\n", isPalindrome(arr, n) ? "YES" : "NO");
    }
    return 0;
}
`,
        java: `// Buggy Code - Fix index boundary
import java.util.Scanner;

public class Solution {
    public static boolean isPalindrome(int[] arr, int n) {
        for (int i = 0; i <= n; i++) { // BUG: loop condition and index
            if (arr[i] != arr[n - i]) { // BUG: arr[n-0] index out of bounds
                return false;
            }
        }
        return true;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int n = sc.nextInt();
            int[] arr = new int[n];
            for (int i = 0; i < n; i++) arr[i] = sc.nextInt();
            System.out.println(isPalindrome(arr, n) ? "YES" : "NO");
        }
    }
}
`
      },
      testCases: [
        { id: 'tc-1', input: '5\n1 2 3 2 1', expectedOutput: 'YES', isHidden: false },
        { id: 'tc-2', input: '4\n1 2 3 4', expectedOutput: 'NO', isHidden: false },
        { id: 'tc-3', input: '1\n99', expectedOutput: 'YES', isHidden: true },
        { id: 'tc-4', input: '6\n10 20 30 30 20 10', expectedOutput: 'YES', isHidden: true }
      ],
      isPublished: true
    },
    {
      id: 'q-bb-2',
      roundId: 1,
      orderIndex: 2,
      type: 'debugging',
      title: 'Faulty Prime Sum & Memory Boundary',
      difficulty: 'Medium',
      points: 70,
      negativePoints: 0,
      description: 'The function should calculate the sum of all prime numbers less than or equal to N. It currently falsely marks 1 as prime and misses composite numbers because of a broken sieve/trial division condition.',
      expectedBehavior: 'Read single integer N. Output the sum of all primes in range [2, N]. If none exist, output 0.',
      buggyCode: {
        python: `# Buggy Code - Fix prime check logic
def sum_primes(n):
    total = 0
    for num in range(1, n + 1): # BUG: Starts from 1 (1 is NOT prime)
        is_prime = True
        for d in range(2, int(num ** 0.5)): # BUG: range excludes int(sqrt(num)), misses squares!
            if num % d == 0:
                is_prime = False
                break
        if is_prime:
            total += num
    return total

import sys
line = sys.stdin.read().strip()
if line:
    n = int(line)
    print(sum_primes(n))
`,
        cpp: `#include <iostream>
using namespace std;

long long sumPrimes(int n) {
    long long total = 0;
    for (int num = 1; num <= n; num++) { // BUG: 1 is not prime
        bool isPrime = true;
        for (int d = 2; d * d < num; d++) { // BUG: strictly less misses exact squares like 4, 9, 25!
            if (num % d == 0) {
                isPrime = false;
                break;
            }
        }
        if (isPrime) total += num;
    }
    return total;
}

int main() {
    int n;
    if (cin >> n) {
        cout << sumPrimes(n) << endl;
    }
    return 0;
}
`,
        c: `#include <stdio.h>
#include <stdbool.h>

long long sumPrimes(int n) {
    long long total = 0;
    for (int num = 1; num <= n; num++) {
        if (num <= 1) continue;
        bool isPrime = true;
        for (int d = 2; d * d < num; d++) { // BUG: d*d <= num needed
            if (num % d == 0) {
                isPrime = false;
                break;
            }
        }
        if (isPrime) total += num;
    }
    return total;
}

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        printf("%lld\n", sumPrimes(n));
    }
    return 0;
}
`,
        java: `import java.util.Scanner;

public class Solution {
    public static long sumPrimes(int n) {
        long total = 0;
        for (int num = 1; num <= n; num++) {
            if (num <= 1) continue;
            boolean isPrime = true;
            for (int d = 2; d * d < num; d++) { // BUG: strict < misses perfect squares
                if (num % d == 0) {
                    isPrime = false;
                    break;
                }
            }
            if (isPrime) total += num;
        }
        return total;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int n = sc.nextInt();
            System.out.println(sumPrimes(n));
        }
    }
}
`
      },
      testCases: [
        { id: 'tc-21', input: '10', expectedOutput: '17', isHidden: false }, // 2+3+5+7 = 17
        { id: 'tc-22', input: '20', expectedOutput: '77', isHidden: false }, // 2+3+5+7+11+13+17+19 = 77
        { id: 'tc-23', input: '1', expectedOutput: '0', isHidden: true },
        { id: 'tc-24', input: '30', expectedOutput: '129', isHidden: true }
      ],
      isPublished: true
    },

    // --- ROUND 2: TRACE & RACE ---
    {
      id: 'q-tr-1',
      roundId: 2,
      orderIndex: 1,
      type: 'mcq',
      title: 'Question 01 — C Pointer Dereference and Post-Increment',
      difficulty: 'Medium',
      points: 10,
      negativePoints: 2,
      description: 'Predict the console output of the following C code snippet accurately:',
      codeSnippet: `#include <stdio.h>

int main() {
    int arr[] = {10, 20, 30, 40, 50};
    int *ptr = arr;
    
    *ptr++;
    printf("%d, ", *ptr);
    
    (*ptr)++;
    printf("%d, ", *ptr);
    
    ++*ptr;
    printf("%d", *ptr);
    
    return 0;
}`,
      options: [
        { id: 'A', text: '10, 20, 21' },
        { id: 'B', text: '20, 21, 22' },
        { id: 'C', text: '11, 20, 30' },
        { id: 'D', text: '20, 20, 21' }
      ],
      correctAnswer: 'B',
      explanation: '*ptr++ increments the pointer address, so ptr now points to arr[1]=20. (*ptr)++ increments the value at ptr to 21. ++*ptr pre-increments value to 22. Result: 20, 21, 22.',
      isPublished: true
    },
    {
      id: 'q-tr-2',
      roundId: 2,
      orderIndex: 2,
      type: 'mcq',
      title: 'Question 02 — Python Default Mutable Argument Trap',
      difficulty: 'Easy',
      points: 10,
      negativePoints: 2,
      description: 'Analyze the function calls and select the correct printed output:',
      codeSnippet: `def storm_logger(item, logs=[]):
    logs.append(item)
    return len(logs)

print(storm_logger("A"), end=" ")
print(storm_logger("B", []), end=" ")
print(storm_logger("C"))`,
      options: [
        { id: 'A', text: '1 1 1' },
        { id: 'B', text: '1 2 3' },
        { id: 'C', text: '1 1 2' },
        { id: 'D', text: '1 2 2' }
      ],
      correctAnswer: 'C',
      explanation: 'In Python, default arguments are evaluated once at function definition. The first call uses the default list (len=1). The second call passes a brand-new empty list (len=1). The third call reuses the original default list which now has "A" and "C" (len=2). Hence "1 1 2".',
      isPublished: true
    },
    {
      id: 'q-tr-3',
      roundId: 2,
      orderIndex: 3,
      type: 'mcq',
      title: 'Question 03 — Bitwise Trickery & Assembly Logic',
      difficulty: 'Medium',
      points: 10,
      negativePoints: 2,
      description: 'What does the function `mystery(x)` evaluate to when given `x = 76` (binary 01001100)?',
      codeSnippet: `int mystery(int x) {
    int count = 0;
    while (x > 0) {
        x = x & (x - 1);
        count++;
    }
    return count;
}`,
      options: [
        { id: 'A', text: '3' },
        { id: 'B', text: '4' },
        { id: 'C', text: '6' },
        { id: 'D', text: '0' }
      ],
      correctAnswer: 'A',
      explanation: 'Brian Kernighan’s algorithm counts the number of set bits (1s) in binary representation. 76 in binary is 64 + 8 + 4 = 01001100_2, which has exactly 3 set bits.',
      isPublished: true
    },
    {
      id: 'q-tr-4',
      roundId: 2,
      orderIndex: 4,
      type: 'mcq',
      title: 'Question 04 — Java Static vs Instance Initialization Order',
      difficulty: 'Hard',
      points: 10,
      negativePoints: 2,
      description: 'What will be output by executing the following Java program?',
      codeSnippet: `class Base {
    static { System.out.print("S1 "); }
    { System.out.print("I1 "); }
    Base() { System.out.print("C1 "); }
}

public class Derived extends Base {
    static { System.out.print("S2 "); }
    { System.out.print("I2 "); }
    Derived() { System.out.print("C2 "); }

    public static void main(String[] args) {
        new Derived();
    }
}`,
      options: [
        { id: 'A', text: 'S1 S2 I1 C1 I2 C2' },
        { id: 'B', text: 'S1 I1 C1 S2 I2 C2' },
        { id: 'C', text: 'S2 S1 I1 C1 I2 C2' },
        { id: 'D', text: 'I1 C1 I2 C2 S1 S2' }
      ],
      correctAnswer: 'A',
      explanation: 'Static initializers run in order of inheritance (Base static -> Derived static: "S1 S2 "). Then during instantiation: Base instance init -> Base constructor -> Derived instance init -> Derived constructor: "I1 C1 I2 C2". Total: "S1 S2 I1 C1 I2 C2".',
      isPublished: true
    },
    {
      id: 'q-tr-5',
      roundId: 2,
      orderIndex: 5,
      type: 'mcq',
      title: 'Question 05 — C++ Post-Decrement Recursion Trap',
      difficulty: 'Medium',
      points: 10,
      negativePoints: 2,
      description: 'What happens when `recurse(3)` is executed in the following snippet?',
      codeSnippet: `int recurse(int n) {
    if (n <= 0) return 1;
    return n * recurse(n--);
}`,
      options: [
        { id: 'A', text: 'Returns 6' },
        { id: 'B', text: 'Returns 1' },
        { id: 'C', text: 'Stack Overflow / Segmentation Fault' },
        { id: 'D', text: 'Compilation Error' }
      ],
      correctAnswer: 'C',
      explanation: 'The expression n-- passes the current value of n (which is 3) to the recursive call recurse(n--) before decrementing in the current frame, causing infinite recursion with argument 3 and resulting in a Stack Overflow.',
      isPublished: true
    },

    // --- ROUND 3: CODE CHALLENGE ---
    {
      id: 'q-cc-1',
      roundId: 3,
      orderIndex: 1,
      type: 'programming',
      title: 'Matrix Spiral Storm Traversal',
      difficulty: 'Medium',
      points: 100,
      timeLimitMs: 2000,
      memoryLimitKb: 256000,
      description: `During the CodeStorm simulation, an autonomous drone travels across an **R x C** atmospheric sensor grid in a clockwise spiral trajectory starting from top-left \`(0,0)\`.

Write a program that takes the matrix dimensions and elements and outputs the sequence of sensor readings collected along the spiral path.`,
      inputFormat: `The first line contains two integers R and C, denoting rows and columns.
The next R lines each contain C space-separated integers.`,
      outputFormat: `Print all elements visited in spiral order on a single line separated by spaces.`,
      constraints: `1 <= R, C <= 100\n-1000 <= Matrix[i][j] <= 1000`,
      examples: [
        {
          input: '3 3\n1 2 3\n4 5 6\n7 8 9',
          output: '1 2 3 6 9 8 7 4 5',
          explanation: 'Traverse right along row 0 (1 2 3), down column 2 (6 9), left along row 2 (8 7), and center (4 5).'
        },
        {
          input: '2 3\n10 20 30\n40 50 60',
          output: '10 20 30 60 50 40',
          explanation: 'Outer perimeter traversed clockwise.'
        }
      ],
      starterCode: {
        python: `import sys

def solve():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    R = int(input_data[0])
    C = int(input_data[1])
    idx = 2
    matrix = []
    for _ in range(R):
        matrix.append([int(x) for x in input_data[idx:idx+C]])
        idx += C
        
    result = []
    # Write your spiral traversal logic here
    
    print(" ".join(map(str, result)))

if __name__ == '__main__':
    solve()
`,
        cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int R, C;
    if (!(cin >> R >> C)) return 0;
    
    vector<vector<int>> matrix(R, vector<int>(C));
    for (int i = 0; i < R; i++) {
        for (int j = 0; j < C; j++) {
            cin >> matrix[i][j];
        }
    }
    
    vector<int> result;
    // Write your spiral order traversal here
    
    for (size_t i = 0; i < result.size(); i++) {
        cout << result[i] << (i + 1 == result.size() ? "" : " ");
    }
    cout << "\n";
    return 0;
}
`,
        c: `#include <stdio.h>

int main() {
    int R, C;
    if (scanf("%d %d", &R, &C) != 2) return 0;
    
    int matrix[100][100];
    for (int i = 0; i < R; i++) {
        for (int j = 0; j < C; j++) {
            scanf("%d", &matrix[i][j]);
        }
    }
    
    // Write your spiral traversal logic here
    
    return 0;
}
`,
        java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        
        int R = sc.nextInt();
        int C = sc.nextInt();
        int[][] matrix = new int[R][C];
        for (int i = 0; i < R; i++) {
            for (int j = 0; j < C; j++) {
                matrix[i][j] = sc.nextInt();
            }
        }
        
        List<Integer> result = new ArrayList<>();
        // Write your spiral traversal logic here
        
        for (int i = 0; i < result.size(); i++) {
            System.out.print(result.get(i) + (i + 1 == result.size() ? "" : " "));
        }
        System.out.println();
    }
}
`
      },
      testCases: [
        { id: 'tc-cc1-1', input: '3 3\n1 2 3\n4 5 6\n7 8 9', expectedOutput: '1 2 3 6 9 8 7 4 5', isHidden: false },
        { id: 'tc-cc1-2', input: '2 3\n10 20 30\n40 50 60', expectedOutput: '10 20 30 60 50 40', isHidden: false },
        { id: 'tc-cc1-3', input: '1 4\n5 10 15 20', expectedOutput: '5 10 15 20', isHidden: true },
        { id: 'tc-cc1-4', input: '4 1\n7\n14\n21\n28', expectedOutput: '7 14 21 28', isHidden: true }
      ],
      isPublished: true
    },
    {
      id: 'q-cc-2',
      roundId: 3,
      orderIndex: 2,
      type: 'programming',
      title: 'Maximum Packet Surge Subarray',
      difficulty: 'Hard',
      points: 150,
      timeLimitMs: 2000,
      memoryLimitKb: 256000,
      description: `In the CodeStorm telemetric hub, consecutive sensor packets arrive with various energy intensities (both positive and negative surges). 

Find the maximum possible sum of a contiguous non-empty subarray of packet values using Kadane’s optimal algorithm.`,
      inputFormat: `Line 1: An integer N representing number of packets.\nLine 2: N space-separated integers representing packet energies.`,
      outputFormat: `A single integer representing the maximum contiguous subarray sum.`,
      constraints: `1 <= N <= 10^5\n-10^4 <= energy[i] <= 10^4`,
      examples: [
        {
          input: '8\n-2 -3 4 -1 -2 1 5 -3',
          output: '7',
          explanation: 'Subarray [4, -1, -2, 1, 5] yields maximum sum = 7.'
        },
        {
          input: '5\n-5 -2 -8 -1 -9',
          output: '-1',
          explanation: 'The maximum single packet is -1.'
        }
      ],
      starterCode: {
        python: `import sys

def max_subarray_sum(arr, n):
    # Implement optimal Kadane algorithm
    pass

def main():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    arr = list(map(int, input_data[1:n+1]))
    print(max_subarray_sum(arr, n))

if __name__ == '__main__':
    main()
`,
        cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

long long maxSubarraySum(const vector<long long>& arr, int n) {
    // Implement Kadane's algorithm
    return 0;
}

int main() {
    int n;
    if (cin >> n) {
        vector<long long> arr(n);
        for (int i = 0; i < n; i++) cin >> arr[i];
        cout << maxSubarraySum(arr, n) << "\n";
    }
    return 0;
}
`,
        c: `#include <stdio.h>

long long maxSubarraySum(int arr[], int n) {
    // Implement Kadane's algorithm
    return 0;
}

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        int arr[100005];
        for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
        printf("%lld\n", maxSubarraySum(arr, n));
    }
    return 0;
}
`,
        java: `import java.util.Scanner;

public class Solution {
    public static long maxSubarraySum(long[] arr, int n) {
        // Implement Kadane's algorithm
        return 0;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int n = sc.nextInt();
            long[] arr = new long[n];
            for (int i = 0; i < n; i++) arr[i] = sc.nextLong();
            System.out.println(maxSubarraySum(arr, n));
        }
    }
}
`
      },
      testCases: [
        { id: 'tc-cc2-1', input: '8\n-2 -3 4 -1 -2 1 5 -3', expectedOutput: '7', isHidden: false },
        { id: 'tc-cc2-2', input: '5\n-5 -2 -8 -1 -9', expectedOutput: '-1', isHidden: false },
        { id: 'tc-cc2-3', input: '4\n10 20 30 40', expectedOutput: '100', isHidden: true },
        { id: 'tc-cc2-4', input: '6\n1 -3 2 1 -1 3', expectedOutput: '5', isHidden: true }
      ],
      isPublished: true
    }
  ];

  const submissions = [];

  const announcements = [
    {
      id: 'ann-1',
      message: '⚡ Welcome to CODESTORM 2026! Ensure your devices are plugged in and stable network connected.',
      priority: 'normal',
      createdBy: 'Dr. Jagat Jeeta Mohanty',
      createdAt: '2026-09-23T08:30:00.000Z'
    },
    {
      id: 'ann-2',
      message: '🚨 Round 1: BUGBUSTER is officially LIVE! You have 30 minutes to eliminate all bugs.',
      priority: 'urgent',
      createdBy: 'Admin Control Center',
      createdAt: '2026-09-23T09:00:00.000Z'
    }
  ];

  const antiCheatLogs = [];

  const eventSettings = {
    eventStatus: 'round1_live',
    currentRoundId: 1,
    leaderboardVisible: false, // HIDDEN by default as per requirement
    leaderboardFrozen: false,
    resultsPublished: false,
    bannerAnnouncement: 'Round 1: BUGBUSTER is in progress! Keep your focus.'
  };

  return {
    users,
    participants,
    rounds,
    questions,
    submissions,
    progress: {},
    announcements,
    antiCheatLogs,
    eventSettings
  };
}

class Database {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_FILE)) {
      console.log('📦 Initializing fresh CodeStorm database with rich seeded data...');
      this.data = getInitialData();
      this.save();
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        console.log('✅ Loaded existing CodeStorm database successfully.');
      } catch (err) {
        console.error('⚠️ Error reading database, recreating default state:', err.message);
        this.data = getInitialData();
        this.save();
      }
    }
    this.normalizeRegistrations();
  }

  normalizeRegistrations() {
    if (!this.data || !Array.isArray(this.data.users)) return;
    let changed = false;
    const salt = bcrypt.genSaltSync(10);

    // Normalize all participants to use Participant ID (CS26-XXXX) and deterministic Password (PASSXXXX)
    for (const u of this.data.users) {
      if (u.role === 'participant') {
        if (u.registrationId) {
          u.registrationId = u.registrationId.trim().toUpperCase();
          const match = u.registrationId.match(/^CODESTORM-2026-(\d+)$/i);
          const seqNum = match ? match[1] : u.registrationId.replace(/\D/g, '').slice(-4).padStart(4, '0');
          const expectedPartId = `CS26-${seqNum}`;
          const expectedPassword = `PASS${seqNum}`;

          const isHashValid = u.passwordHash && bcrypt.compareSync(expectedPassword, u.passwordHash);
          if (u.participantId !== expectedPartId || !isHashValid) {
            u.participantId = expectedPartId;
            u.passwordHash = bcrypt.hashSync(expectedPassword, salt);
            u.mustChangePassword = false;
            changed = true;
          }
        }
      }
    }

    for (const p of this.data.participants) {
      if (p.registrationId) {
        p.registrationId = p.registrationId.trim().toUpperCase();
        const match = p.registrationId.match(/^CODESTORM-2026-(\d+)$/i);
        const seqNum = match ? match[1] : p.registrationId.replace(/\D/g, '').slice(-4).padStart(4, '0');
        const expectedPartId = `CS26-${seqNum}`;
        if (p.participantId !== expectedPartId) {
          p.participantId = expectedPartId;
          changed = true;
        }
      }
    }

    if (changed) {
      this.save();
    }
  }

  parseYearAndBranch(rawYB) {
    if (!rawYB || typeof rawYB !== 'string') {
      return { year: '', branch: '', section: '' };
    }
    const clean = rawYB.trim();
    let section = '';
    const sectionMatch = clean.match(/\(([^)]+)\)$/);
    if (sectionMatch) section = sectionMatch[1].trim();

    const withoutSection = clean.replace(/\s*\([^)]+\)$/, '').trim();
    const parts = withoutSection.split(' - ');
    const year = (parts[0] || '').trim();
    const branch = (parts.slice(1).join(' - ') || '').trim();

    return { year, branch, section };
  }

  async syncParticipantFromGoogleSheets(targetRegistrationId) {
    if (!targetRegistrationId) return null;
    const cleanRegId = targetRegistrationId.trim().toUpperCase();

    const scriptUrl = process.env.VITE_GOOGLE_SCRIPT_URL ||
                      process.env.GOOGLE_SCRIPT_URL ||
                      'https://script.google.com/macros/s/AKfycbyU3tUtbG6bzxDUAnOYjdUcC-FbPPDrv6Z9jG0XsxIeF8ZKO4oiD3zWW3HyCBv8cz-F/exec';

    if (!scriptUrl) return null;

    try {
      let reg = null;

      // 1. Try GET lookup
      try {
        const res = await fetch(`${scriptUrl}?action=lookup&registrationId=${encodeURIComponent(cleanRegId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json && json.success && Array.isArray(json.registrations) && json.registrations.length > 0) {
            reg = json.registrations.find(r => (r.registrationId || '').toUpperCase() === cleanRegId) || json.registrations[0];
          }
        }
      } catch (getErr) {
        console.warn('[syncParticipantFromGoogleSheets GET lookup note]', getErr.message);
      }

      // 2. Try POST lookup if GET didn't succeed
      if (!reg) {
        try {
          const postRes = await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'lookup', registrationId: cleanRegId })
          });
          if (postRes.ok) {
            const postJson = await postRes.json();
            if (postJson && postJson.success && Array.isArray(postJson.registrations) && postJson.registrations.length > 0) {
              reg = postJson.registrations.find(r => (r.registrationId || '').toUpperCase() === cleanRegId) || postJson.registrations[0];
            }
          }
        } catch (postErr) {
          console.warn('[syncParticipantFromGoogleSheets POST lookup note]', postErr.message);
        }
      }

      if (reg) {
        const rawYB = reg.yearAndBranch || '';
        const { year, branch, section } = this.parseYearAndBranch(rawYB);

        const created = this.createParticipantFromRegistration({
          name: reg.name,
          rollNumber: reg.rollNumber,
          email: reg.email,
          mobile: reg.mobile,
          yearAndBranch: rawYB,
          year: reg.year || year,
          branch: reg.branch || branch,
          section: reg.section || section,
          registrationId: cleanRegId,
          participantId: reg.participantId || undefined,
          temporaryPassword: reg.temporaryPassword || reg.password || undefined
        });
        return created;
      }
    } catch (err) {
      console.warn('[syncParticipantFromGoogleSheets]', err.message);
    }
    return null;
  }

  async syncFromGoogleSheets() {
    const scriptUrl = process.env.VITE_GOOGLE_SCRIPT_URL ||
                      process.env.GOOGLE_SCRIPT_URL ||
                      'https://script.google.com/macros/s/AKfycbyU3tUtbG6bzxDUAnOYjdUcC-FbPPDrv6Z9jG0XsxIeF8ZKO4oiD3zWW3HyCBv8cz-F/exec';

    if (!scriptUrl) return { success: false, message: 'Google Script URL not configured' };

    try {
      console.log('🔄 Checking Google Apps Script for all registrations...');
      let json = null;

      // 1. Try GET ?action=getRegistrations
      try {
        const res = await fetch(`${scriptUrl}?action=getRegistrations`);
        if (res.ok) {
          json = await res.json();
        }
      } catch (getErr) {
        console.warn('GET ?action=getRegistrations note:', getErr.message);
      }

      // 2. If not array, try POST action=getRegistrations
      if (!json || !json.registrations || !Array.isArray(json.registrations)) {
        try {
          const postRes = await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'getRegistrations' })
          });
          if (postRes.ok) {
            json = await postRes.json();
          }
        } catch (postErr) {
          console.warn('POST action=getRegistrations note:', postErr.message);
        }
      }

      if (json && json.success && Array.isArray(json.registrations) && json.registrations.length > 0) {
        console.log(`📥 Received ${json.registrations.length} registrations from Google Sheets. Synchronizing...`);
        const syncResult = this.syncAllRegistrations(json.registrations);
        return {
          success: true,
          count: json.registrations.length,
          ...syncResult
        };
      } else {
        return {
          success: false,
          message: 'Google Apps Script has not yet returned registrations list. The Apps Script deployment may need to be updated with New Version.',
          raw: json
        };
      }
    } catch (err) {
      console.warn('syncFromGoogleSheets error:', err.message);
      return { success: false, error: err.message };
    }
  }

  syncAllRegistrations(registrations) {
    if (!Array.isArray(registrations)) {
      return { total: 0, synced: 0, created: 0, updated: 0, errors: [] };
    }

    let createdCount = 0;
    let updatedCount = 0;
    const errors = [];

    for (const reg of registrations) {
      try {
        const regId = String(reg.registrationId || reg['Registration ID'] || reg.id || '').trim().toUpperCase();
        const name = String(reg.name || reg['Name'] || reg['Full Name'] || '').trim();
        if (!regId) {
          errors.push({ record: reg, reason: 'Missing Registration ID' });
          continue;
        }

        const rollNumber = String(reg.rollNumber || reg['Roll Number'] || reg['Roll No'] || '').trim().toUpperCase();
        const email = String(reg.email || reg['Email'] || reg['Email Address'] || '').trim().toLowerCase();
        const mobile = String(reg.mobile || reg['Mobile Number'] || reg['Mobile'] || reg['Phone'] || '').trim();
        const rawYB = String(reg.yearAndBranch || reg['Year & Branch'] || reg['Year and Branch'] || '').trim();

        let year = String(reg.year || reg['Year'] || '').trim();
        let branch = String(reg.branch || reg['Branch'] || '').trim();
        let section = String(reg.section || reg['Section'] || '').trim();

        if ((!year || !branch) && rawYB) {
          const parsed = this.parseYearAndBranch(rawYB);
          if (!year) year = parsed.year;
          if (!branch) branch = parsed.branch;
          if (!section && parsed.section) section = parsed.section;
        }

        const res = this.createParticipantFromRegistration({
          registrationId: regId,
          participantId: reg.participantId || undefined,
          temporaryPassword: reg.temporaryPassword || reg.password || undefined,
          name: name || `Participant ${regId}`,
          rollNumber: rollNumber || 'N/A',
          email: email || `${regId.toLowerCase()}@codestorm.live`,
          mobile: mobile || '',
          yearAndBranch: rawYB || `${year} - ${branch}`,
          year: year || '3rd Year',
          branch: branch || 'CSE – Data Science',
          section: section || 'A',
          college: reg.college || 'Malla Reddy Engineering College and Management Sciences'
        });

        if (res.alreadyExists) {
          updatedCount++;
        } else {
          createdCount++;
        }
      } catch (err) {
        errors.push({ record: reg, reason: err.message });
      }
    }

    this.save();
    return {
      total: registrations.length,
      synced: createdCount + updatedCount,
      created: createdCount,
      updated: updatedCount,
      errors
    };
  }

  getMigrationDiagnostic() {
    const participants = this.data.participants || [];
    const report = [];

    // Sort by registrationId
    const sorted = [...participants].sort((a, b) => {
      const idA = a.registrationId || a.participantId || '';
      const idB = b.registrationId || b.participantId || '';
      return idA.localeCompare(idB);
    });

    for (const p of sorted) {
      const regId = (p.registrationId || p.participantId || '').trim().toUpperCase();
      const user = this.findUserByRegistrationId(regId);

      const hasAuth = !!user && user.role === 'participant';
      const authValid = hasAuth && bcrypt.compareSync(regId, user.passwordHash);
      const profileValid = !!p.name && (p.name.trim() !== '') && !!p.rollNumber;

      const authStatus = authValid ? 'AUTH OK' : (hasAuth ? 'AUTH PENDING HASH' : 'AUTH MISSING');
      const profileStatus = profileValid ? 'PROFILE OK' : 'PROFILE INCOMPLETE';
      const status = (authValid && profileValid) ? 'OK' : 'NEEDS ATTENTION';

      report.push({
        registrationId: regId,
        name: p.name,
        rollNumber: p.rollNumber,
        email: p.email,
        authStatus,
        profileStatus,
        status
      });
    }

    return report;
  }

  save() {
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('❌ Failed saving database:', err);
    }
  }

  // --- Users ---
  findUserByEmailOrParticipantId(identifier) {
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase();
    const cleanUpper = identifier.trim().toUpperCase();
    return this.data.users.find(u => {
      const email = (u.email || '').toLowerCase();
      if (email === clean) return true;
      if (u.registrationId && u.registrationId.toUpperCase() === cleanUpper) return true;
      if (u.participantId && u.participantId.toLowerCase() === clean) return true;
      if (u.participantId && u.participantId.toUpperCase() === cleanUpper) return true;
      if (u.role === 'admin' && (clean === 'admin' || clean === 'admin@codestorm.live' || clean === 'admin@codestorm.mrem.ac.in')) return true;
      if (u.role === 'coordinator' && (clean === 'coordinator' || clean === 'coordinator@codestorm.live' || clean === 'coordinator@codestorm.mrem.ac.in')) return true;
      return false;
    });
  }

  findUserById(id) {
    return this.data.users.find(u => u.id === id);
  }

  findUserByParticipantId(participantId) {
    if (!participantId) return null;
    const clean = participantId.trim().toLowerCase();
    return this.data.users.find(u => u.participantId && u.participantId.toLowerCase() === clean);
  }

  updateUser(id, updates) {
    const user = this.findUserById(id);
    if (!user) return null;
    Object.assign(user, updates);
    this.save();
    return user;
  }

  updateUserPassword(userId, newPasswordHash) {
    const user = this.findUserById(userId);
    if (!user) return false;
    user.passwordHash = newPasswordHash;
    user.mustChangePassword = false;
    this.save();
    return true;
  }

  findUserByRegistrationId(registrationId) {
    if (!registrationId) return null;
    const clean = registrationId.trim().toUpperCase();
    return this.data.users.find(u => {
      if (u.registrationId && u.registrationId.toUpperCase() === clean) return true;
      if (u.participantId && u.participantId.toUpperCase() === clean) return true;
      return false;
    });
  }

  generateUniqueRegistrationId() {
    let seq = 1;
    while (this.findUserByRegistrationId(`CODESTORM-2026-${String(seq).padStart(4, '0')}`)) {
      seq++;
    }
    return `CODESTORM-2026-${String(seq).padStart(4, '0')}`;
  }

  createParticipantFromRegistration(regData) {
    const email = String(regData.email || '').trim().toLowerCase();
    const rollNumber = String(regData.rollNumber || '').trim().toUpperCase();
    let registrationId = String(regData.registrationId || '').trim();
    if (!registrationId) {
      registrationId = this.generateUniqueRegistrationId();
    }
    const cleanRegId = registrationId.toUpperCase();

    // Generate Participant ID based on registration sequence (CODESTORM-2026-XXXX -> CS26-XXXX)
    let participantId = String(regData.participantId || '').trim();
    if (!participantId) {
      participantId = generateParticipantId(cleanRegId);
    }

    // Generate deterministic password: PASS + 4-digit registration number (e.g. PASS9216)
    const temporaryPassword = String(
      regData.temporaryPassword ||
      regData.password ||
      generateDeterministicPassword(cleanRegId || participantId)
    ).trim();

    // 1. Prevent duplicate account creation if submitted twice or retried
    let existingUser = null;
    if (cleanRegId) {
      existingUser = this.findUserByRegistrationId(cleanRegId);
    }
    if (!existingUser && email) {
      existingUser = this.findUserByEmailOrParticipantId(email);
    }
    if (!existingUser && rollNumber) {
      const existingParticipant = this.data.participants.find(
        p => p.rollNumber && p.rollNumber.toUpperCase() === rollNumber
      );
      if (existingParticipant) {
        existingUser = this.findUserById(existingParticipant.userId) || this.findUserByParticipantId(existingParticipant.participantId);
      }
    }

    let year = String(regData.year || '').trim();
    let branch = String(regData.branch || '').trim();
    let section = String(regData.section || '').trim();
    if ((!year || !branch) && regData.yearAndBranch) {
      const parsed = this.parseYearAndBranch(String(regData.yearAndBranch));
      if (!year) year = parsed.year;
      if (!branch) branch = parsed.branch;
      if (!section && parsed.section) section = parsed.section;
    }

    const salt = bcrypt.genSaltSync(10);

    if (existingUser) {
      // The registration submission / Google Sheet record is authoritative
      if (regData.name && String(regData.name).trim()) {
        existingUser.name = String(regData.name).trim();
      }
      if (email) {
        existingUser.email = email;
      }
      existingUser.registrationId = cleanRegId;
      if (participantId) {
        existingUser.participantId = participantId;
      }
      // ONLY update passwordHash if explicit temporaryPassword/password was passed in regData
      if (regData.temporaryPassword || regData.password) {
        existingUser.passwordHash = bcrypt.hashSync(String(regData.temporaryPassword || regData.password).trim(), salt);
      }
      existingUser.mustChangePassword = false;

      // Update associated participant record as well
      let existingParticipant = this.data.participants.find(
        p => (p.registrationId && p.registrationId.toUpperCase() === cleanRegId) ||
             (p.userId && p.userId === existingUser.id) ||
             (p.participantId && p.participantId.toUpperCase() === cleanRegId) ||
             (p.participantId && p.participantId.toUpperCase() === participantId.toUpperCase())
      );

      const nowIso = new Date().toISOString();
      if (existingParticipant) {
        existingParticipant.name = existingUser.name;
        existingParticipant.email = existingUser.email;
        if (rollNumber) existingParticipant.rollNumber = rollNumber;
        if (regData.mobile) existingParticipant.mobile = String(regData.mobile).trim();
        if (year) existingParticipant.year = year;
        if (branch) existingParticipant.branch = branch;
        if (section) existingParticipant.section = section;
        existingParticipant.registrationId = cleanRegId;
        existingParticipant.participantId = participantId;
      } else {
        existingParticipant = {
          id: `p-${Date.now()}-${crypto.randomInt(100, 999)}`,
          userId: existingUser.id,
          participantId: participantId,
          registrationId: cleanRegId,
          name: existingUser.name,
          email: existingUser.email,
          college: regData.college || 'Malla Reddy Engineering College and Management Sciences',
          rollNumber: rollNumber || 'N/A',
          year: year || '3rd Year',
          branch: branch || 'CSE – Data Science',
          section: section || 'A',
          mobile: regData.mobile ? String(regData.mobile).trim() : '',
          checkedIn: true,
          checkedInAt: nowIso,
          status: 'active',
          score: 0,
          solvedCount: 0,
          penalty: 0,
          lastSubmissionTime: null,
          createdAt: nowIso,
          updatedAt: nowIso
        };
        this.data.participants.push(existingParticipant);
      }

      this.save();

      return {
        alreadyExists: true,
        registrationId: cleanRegId,
        participantId: participantId,
        temporaryPassword: temporaryPassword,
        name: existingUser.name,
        email: existingUser.email,
        rollNumber: (existingParticipant && existingParticipant.rollNumber) || rollNumber,
        message: 'Registration synchronized successfully'
      };
    }

    // 2. Hash temporary password securely (Store passwordHash, never plaintext password)
    const passwordHash = bcrypt.hashSync(temporaryPassword, salt);

    const nowIso = new Date().toISOString();
    const userId = `user-p-${Date.now()}-${crypto.randomInt(100, 999)}`;

    // 3. Save User Account using Registration ID as permanent unique link and passwordHash
    const newUser = {
      id: userId,
      participantId: participantId,
      registrationId: cleanRegId,
      name: (regData.name || '').trim(),
      email,
      passwordHash,
      role: 'participant',
      mustChangePassword: false,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // 4. Save Participant Record associated with registration
    const newParticipant = {
      id: `p-${Date.now()}-${crypto.randomInt(100, 999)}`,
      userId,
      participantId: participantId,
      registrationId: cleanRegId,
      name: (regData.name || '').trim(),
      email,
      college: regData.college || 'Malla Reddy Engineering College and Management Sciences',
      rollNumber,
      year: year || '3rd Year',
      branch: branch || 'CSE – Data Science',
      section: section || 'A',
      mobile: regData.mobile ? String(regData.mobile).trim() : '',
      checkedIn: false,
      checkedInAt: null,
      status: 'active',
      score: 0,
      solvedCount: 0,
      penalty: 0,
      lastSubmissionTime: null,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    this.data.users.push(newUser);
    this.data.participants.push(newParticipant);
    this.save();

    return {
      alreadyExists: false,
      registrationId: cleanRegId,
      participantId: participantId,
      temporaryPassword: temporaryPassword,
      name: newParticipant.name,
      email: newParticipant.email,
      rollNumber: newParticipant.rollNumber,
      message: 'Registration successful'
    };
  }


  // --- Participants ---
  getParticipants() {
    return this.data.participants;
  }

  findParticipantById(idOrParticipantId) {
    if (!idOrParticipantId) return null;
    const clean = idOrParticipantId.trim().toLowerCase();
    const cleanUpper = idOrParticipantId.trim().toUpperCase();
    return this.data.participants.find(p => 
      (p.id && p.id.toLowerCase() === clean) || 
      (p.registrationId && p.registrationId.toUpperCase() === cleanUpper) ||
      (p.participantId && p.participantId.toUpperCase() === cleanUpper) ||
      (p.userId && p.userId.toLowerCase() === clean)
    );
  }

  updateParticipant(idOrParticipantId, updates) {
    const p = this.findParticipantById(idOrParticipantId);
    if (!p) return null;
    Object.assign(p, updates);
    this.save();
    return p;
  }

  // --- Rounds ---
  getRounds() {
    return this.data.rounds;
  }

  getRoundById(roundId) {
    return this.data.rounds.find(r => r.id === Number(roundId));
  }

  updateRound(roundId, updates) {
    const r = this.getRoundById(roundId);
    if (!r) return null;
    Object.assign(r, updates);
    this.save();
    return r;
  }

  // --- Questions ---
  getQuestionsByRound(roundId) {
    return this.data.questions.filter(q => q.roundId === Number(roundId));
  }

  getQuestionById(id) {
    return this.data.questions.find(q => q.id === id);
  }

  createQuestion(questionData) {
    const newQ = { id: `q-${Date.now()}`, ...questionData };
    this.data.questions.push(newQ);
    this.save();
    return newQ;
  }

  updateQuestion(id, updates) {
    const q = this.getQuestionById(id);
    if (!q) return null;
    Object.assign(q, updates);
    this.save();
    return q;
  }

  deleteQuestion(id) {
    const idx = this.data.questions.findIndex(q => q.id === id);
    if (idx !== -1) {
      const removed = this.data.questions.splice(idx, 1)[0];
      this.save();
      return removed;
    }
    return null;
  }

  // --- Submissions ---
  getSubmissions(filter = {}) {
    return this.data.submissions.filter(s => {
      if (filter.participantId && s.participantId !== filter.participantId) return false;
      if (filter.roundId && s.roundId !== Number(filter.roundId)) return false;
      if (filter.questionId && s.questionId !== filter.questionId) return false;
      return true;
    });
  }

  createSubmission(submissionData) {
    const newSub = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      submittedAt: new Date().toISOString(),
      ...submissionData
    };
    this.data.submissions.unshift(newSub);

    // Update participant score and rank calculation
    this.recalculateParticipantStats(newSub.participantId);
    this.save();
    return newSub;
  }

  recalculateParticipantStats(participantId) {
    const participant = this.findParticipantById(participantId);
    if (!participant) return;

    const userSubs = this.data.submissions.filter(s => s.participantId === participant.participantId);
    
    // Group by questionId to take best score
    const bestByQuestion = {};
    let totalScore = 0;
    let solvedCount = 0;
    let penalty = 0;

    userSubs.forEach(s => {
      if (!bestByQuestion[s.questionId] || s.score > bestByQuestion[s.questionId].score) {
        bestByQuestion[s.questionId] = s;
      }
    });

    Object.values(bestByQuestion).forEach(s => {
      totalScore += s.score || 0;
      if (s.status === 'Accepted' || s.score > 0) {
        solvedCount++;
      }
    });

    participant.score = totalScore;
    participant.solvedCount = solvedCount;
    participant.penalty = penalty;
    participant.lastSubmissionTime = new Date().toISOString();
  }

  // --- Auto-Save Progress ---
  saveProgress(participantId, roundId, questionId, data) {
    const key = `${participantId}_${roundId}_${questionId}`;
    this.data.progress[key] = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.progress[key];
  }

  getProgress(participantId, roundId, questionId) {
    const key = `${participantId}_${roundId}_${questionId}`;
    return this.data.progress[key] || null;
  }

  // --- Announcements ---
  getAnnouncements() {
    return this.data.announcements;
  }

  createAnnouncement(message, priority = 'normal', createdBy = 'Admin') {
    const ann = {
      id: `ann-${Date.now()}`,
      message,
      priority,
      createdBy,
      createdAt: new Date().toISOString()
    };
    this.data.announcements.unshift(ann);
    this.save();
    return ann;
  }

  // --- Anti Cheat Logs ---
  getAntiCheatLogs() {
    return this.data.antiCheatLogs;
  }

  logAntiCheat(participantId, participantName, eventType, details, severity = 'low') {
    const log = {
      id: `ac-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      participantId,
      participantName: participantName || participantId,
      eventType,
      details,
      severity,
      timestamp: new Date().toISOString()
    };
    this.data.antiCheatLogs.unshift(log);
    this.save();
    return log;
  }

  // --- Event Settings ---
  getEventSettings() {
    return this.data.eventSettings;
  }

  updateEventSettings(updates) {
    Object.assign(this.data.eventSettings, updates);
    this.save();
    return this.data.eventSettings;
  }

  // --- Reset Entire Database to Seed ---
  resetAll() {
    this.data = getInitialData();
    this.save();
    return this.data;
  }
}

export const db = new Database();
export default db;
