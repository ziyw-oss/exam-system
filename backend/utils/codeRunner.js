// backend/utils/codeRunner.js (ESM 版本)
import { VM } from "vm2";

function runStudentCode(code, input) {
  const vm = new VM({ timeout: 1000 });
  try {
    const wrappedCode = `
      ${code}
      toBinary(${input});
    `;
    const result = vm.run(wrappedCode);
    return { result };
  } catch (err) {
    return { error: err.message };
  }
}

export function gradeCode(qid, code, testCases) {
  let score = 0;
  const results = [];

  for (const test of testCases) {
    const { input, expected } = test;
    const output = runStudentCode(code, input);
    if (output.error) {
      results.push({ input, error: output.error });
      continue;
    }
    const isCorrect = String(output.result) === String(expected);
    if (isCorrect) score++;
    results.push({ input, expected, actual: output.result, isCorrect });
  }

  return {
    score,
    max: testCases.length,
    results
  };
}
