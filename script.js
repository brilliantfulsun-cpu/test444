/*
  내글답게 최종 구조
  - 학습자는 원문 전체와 수정본 전체만 입력합니다.
  - 앱은 원문 안에서 주장, 근거, 사례, 반론, 결론, 문체 특징을 규칙으로 탐지합니다.
  - 분석 결과는 정답이나 성적이 아니라 고쳐쓰기 방향을 찾는 참고 자료입니다.
*/

// ---------------------------------------------------------------------------
// 1. 공통 화면 요소와 저장 도우미
// ---------------------------------------------------------------------------

const stepTabs = document.querySelectorAll(".step-tab");
const stepPanels = document.querySelectorAll(".step-panel");
const previousButton = document.querySelector("#previousButton");
const nextButton = document.querySelector("#nextButton");
const stepStatus = document.querySelector("#stepStatus");
const progressFill = document.querySelector("#progressFill");
const appNotice = document.querySelector("#appNotice");

const topicInput = document.querySelector("#topic");
const originalEssayInput = document.querySelector("#originalEssay");
const revisionEssayInput = document.querySelector("#revisionEssay");
const originalCharacterCount = document.querySelector("#originalCharacterCount");
const revisionCharacterCount = document.querySelector("#revisionCharacterCount");
const originalSaveMessage = document.querySelector("#originalSaveMessage");
const revisionSaveMessage = document.querySelector("#revisionSaveMessage");

const totalSteps = stepPanels.length;
const minimumEssayLength = 80;
let currentStep = 0;

// 원문과 수정본은 앱 전체에서 함께 사용하는 변수에 보관합니다.
let writingData = {
  topic: "",
  originalEssay: "",
  revisionEssay: ""
};

const nextButtonLabels = [
  "논증 구조 평가 보기",
  "문장·표현 평가 보기",
  "종합 피드백 보기",
  "고쳐쓰기 시작하기",
  "수정 전후 비교 보기",
  "모든 단계 완료"
];

// 브라우저 저장 기능이 차단되어도 앱이 멈추지 않도록 안전하게 처리합니다.
function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn("저장된 내용을 읽지 못했습니다.", error);
    return null;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn("내용을 저장하지 못했습니다.", error);
    return false;
  }
}

function saveWritingData() {
  return writeStorage("naegeuldapgeWritingData", JSON.stringify(writingData));
}

function loadWritingData() {
  const savedData = readStorage("naegeuldapgeWritingData");

  if (!savedData) {
    return;
  }

  try {
    const parsedData = JSON.parse(savedData);
    ["topic", "originalEssay", "revisionEssay"].forEach((key) => {
      if (typeof parsedData[key] === "string") {
        writingData[key] = parsedData[key];
      }
    });
  } catch (error) {
    console.warn("저장된 작성 데이터가 올바르지 않습니다.", error);
  }
}

function showNotice(message, type = "warning") {
  appNotice.textContent = message;
  appNotice.className = `app-notice notice-${type}`;
  appNotice.hidden = false;
}

function clearNotice() {
  appNotice.textContent = "";
  appNotice.hidden = true;
}

function updateCharacterCounts() {
  originalCharacterCount.textContent = `${writingData.originalEssay.length}자`;
  revisionCharacterCount.textContent = `${writingData.revisionEssay.length}자`;
}

// ---------------------------------------------------------------------------
// 2. 단계 이동과 입력 확인
// ---------------------------------------------------------------------------

function canMoveForward(targetStep) {
  if (targetStep <= currentStep) {
    return true;
  }

  const essay = writingData.originalEssay.trim();

  if (!essay) {
    showNotice("먼저 작성한 논증글 전체를 입력해 주세요.");
    originalEssayInput.classList.add("input-warning");
    originalEssayInput.focus();
    return false;
  }

  if (essay.length < minimumEssayLength) {
    showNotice(
      `현재 본문은 ${essay.length}자입니다. 조금 더 작성해 보세요. 약 ${minimumEssayLength}자 이상이면 평가 결과를 살펴보기 좋습니다.`
    );
    originalEssayInput.classList.add("input-warning");
    originalEssayInput.focus();
    return false;
  }

  return true;
}

function moveToStep(targetStep) {
  const safeStep = Math.max(0, Math.min(totalSteps - 1, targetStep));
  clearNotice();

  if (!canMoveForward(safeStep)) {
    return;
  }

  showStep(safeStep);

  if (safeStep === 5 && !writingData.revisionEssay.trim()) {
    showNotice("먼저 5단계에서 수정본을 작성해 주세요.", "info");
  }
}

function showStep(stepNumber) {
  currentStep = Math.max(0, Math.min(totalSteps - 1, stepNumber));

  stepTabs.forEach((tab, index) => {
    const isCurrent = index === currentStep;
    tab.classList.toggle("active", isCurrent);
    tab.classList.toggle("completed", index < currentStep);

    if (isCurrent) {
      tab.setAttribute("aria-current", "step");
    } else {
      tab.removeAttribute("aria-current");
    }
  });

  stepPanels.forEach((panel, index) => {
    panel.classList.toggle("active", index === currentStep);
  });

  previousButton.disabled = currentStep === 0;
  nextButton.disabled = currentStep === totalSteps - 1;
  nextButton.textContent = nextButtonLabels[currentStep];
  stepStatus.textContent = `${currentStep + 1} / ${totalSteps} 단계`;
  progressFill.style.width = `${((currentStep + 1) / totalSteps) * 100}%`;

  if (currentStep === 1) renderStructureEvaluation();
  if (currentStep === 2) renderExpressionEvaluation();
  if (currentStep === 3) renderOverallFeedback();
  if (currentStep === 4) renderRevisionScreen();
  if (currentStep === 5) renderComparisonScreen();
}

previousButton.addEventListener("click", () => moveToStep(currentStep - 1));
nextButton.addEventListener("click", () => moveToStep(currentStep + 1));

stepTabs.forEach((tab) => {
  tab.addEventListener("click", () => moveToStep(Number(tab.dataset.step)));
});

// ---------------------------------------------------------------------------
// 3. 원문과 수정본 입력 관리
// ---------------------------------------------------------------------------

topicInput.addEventListener("input", (event) => {
  writingData.topic = event.target.value;
  saveWritingData();
});

originalEssayInput.addEventListener("input", (event) => {
  writingData.originalEssay = event.target.value;
  originalEssayInput.classList.remove("input-warning");
  clearNotice();
  updateCharacterCounts();
  saveWritingData();
});

revisionEssayInput.addEventListener("input", (event) => {
  writingData.revisionEssay = event.target.value;
  clearNotice();
  updateCharacterCounts();
  saveWritingData();
});

document.querySelector("#saveOriginalButton").addEventListener("click", () => {
  originalSaveMessage.textContent = saveWritingData()
    ? "원문을 저장했습니다."
    : "브라우저 저장 기능을 사용할 수 없습니다. 현재 화면에서는 내용이 유지됩니다.";
});

document.querySelector("#saveRevisionButton").addEventListener("click", () => {
  revisionSaveMessage.textContent = saveWritingData()
    ? "수정본이 저장되었습니다. 이제 수정 전후 비교 단계에서 확인할 수 있습니다."
    : "브라우저 저장 기능을 사용할 수 없습니다. 현재 화면에서는 내용이 유지됩니다.";
});

// ---------------------------------------------------------------------------
// 4. 글 분석에 사용하는 공통 함수
// ---------------------------------------------------------------------------

function countExpression(text, expression) {
  return text.split(expression).length - 1;
}

function countExpressionList(text, expressions) {
  return expressions.reduce(
    (total, expression) => total + countExpression(text, expression),
    0
  );
}

function getSentences(text) {
  return text
    .split(/[.!?。]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function getSentencesWithPunctuation(text) {
  return (text.match(/[^.!?。]+[.!?。]?/g) || [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function getParagraphs(text) {
  if (!text.trim()) return [];

  return text
    .trim()
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.trim());
}

function clampScore(score) {
  return Math.max(1, Math.min(5, score));
}

const perspectiveExpressions = [
  "나는", "내가", "나의", "필자는", "내 생각", "내 경험으로는",
  "라고 본다", "판단한다", "생각한다", "주장한다"
];

const concreteExpressions = [
  "예를 들어", "실제로", "내 경험으로는", "구체적으로", "한 사례로",
  "수업에서", "학교에서", "일상에서", "조사", "통계", "연구", "사례"
];

const counterExpressions = [
  "물론", "반면", "그러나", "하지만", "한편", "반론", "다른 관점"
];

const aiStyleRules = [
  {
    category: "상투적 도입 표현",
    expressions: ["현대 사회에서", "오늘날", "최근 들어", "많은 사람들이", "중요한 문제이다", "사회적으로 큰 의미가 있다"],
    explanation: "여러 논증문에서 자주 사용되어 글의 시작이 획일적으로 느껴질 수 있습니다.",
    question: "이 문제가 실제로 드러나는 구체적인 상황으로 글을 시작할 수 있을까요?"
  },
  {
    category: "기계적인 연결 표현",
    expressions: ["첫째", "둘째", "셋째", "결론적으로", "이를 통해", "따라서", "또한", "나아가"],
    explanation: "연결 표현이 반복되면 내용보다 정해진 글쓰기 틀이 먼저 보일 수 있습니다.",
    question: "접속어를 하나 지워도 문장 순서만으로 생각이 이어지는지 읽어 보세요."
  },
  {
    category: "지나치게 포괄적인 표현",
    expressions: ["다각도로 고려해야 한다", "다양한 측면에서 살펴볼 필요가 있다", "긍정적인 영향을 미친다", "부정적인 영향을 미친다", "문제를 해결해야 한다", "바람직한 방향으로 나아가야 한다"],
    explanation: "무엇이 어떻게 달라지는지 구체적으로 밝히지 않아 필자의 판단이 흐려질 수 있습니다.",
    question: "영향을 받는 사람이나 실제 변화를 구체적으로 밝힐 수 있을까요?"
  },
  {
    category: "반복될 수 있는 종결 표현",
    expressions: ["할 수 있다", "해야 한다", "필요가 있다", "것이다", "라고 생각한다"],
    explanation: "같은 끝맺음이 반복되면 문장이 단조롭게 느껴질 수 있습니다.",
    question: "일부 문장에서 판단이나 이유를 더 직접적으로 드러낼 수 있을까요?"
  }
];

function diagnoseAiStyle(text) {
  const findings = [];
  const questions = [];
  let riskScore = 0;

  aiStyleRules.forEach((rule) => {
    rule.expressions.forEach((expression) => {
      const count = countExpression(text, expression);
      if (!count) return;

      findings.push({ ...rule, expression, count });
      if (!questions.includes(rule.question)) questions.push(rule.question);

      if (rule.category === "상투적 도입 표현" || rule.category === "지나치게 포괄적인 표현") {
        riskScore += count * 2;
      } else if (count >= 2) {
        riskScore += count;
      }
    });
  });

  const perspectiveCount = countExpressionList(text, perspectiveExpressions);
  const concreteCount = countExpressionList(text, concreteExpressions) + (/\d/.test(text) ? 1 : 0);

  if (text.trim() && perspectiveCount === 0) {
    riskScore += 2;
    questions.push("정보를 설명한 뒤, 나는 왜 이 점을 중요하게 보는지 한 문장으로 밝혀 볼 수 있을까요?");
  }

  if (text.trim() && concreteCount === 0) {
    riskScore += 2;
    questions.push("일반적인 설명 하나를 실제 경험, 학교 상황, 숫자 자료 중 하나로 구체화할 수 있을까요?");
  }

  const sentenceDiagnostics = getSentencesWithPunctuation(text)
    .map((sentence) => {
      const matches = findings.filter((finding) => sentence.includes(finding.expression));
      if (!matches.length) return null;

      return {
        sentence,
        explanation: `${matches.map((item) => `“${item.expression}”`).join(", ")} 표현 때문에 ${matches[0].explanation}`
      };
    })
    .filter(Boolean);

  let riskLevel = "낮음";
  let riskClass = "risk-low";
  let description = "현재 규칙에서는 AI 글과 유사하게 보일 가능성이 높지 않습니다. 필자의 경험과 판단이 충분히 드러나는지 마지막으로 확인해 보세요.";

  if (riskScore >= 9) {
    riskLevel = "높음";
    riskClass = "risk-high";
    description = "익숙한 표현과 일반적인 설명이 여러 곳에서 보여 AI 글과 유사하게 보일 가능성이 있습니다. 이는 글이 나쁘다는 뜻이 아닙니다. 한두 문장부터 자신의 상황과 판단으로 구체화해 보세요.";
  } else if (riskScore >= 4) {
    riskLevel = "보통";
    riskClass = "risk-medium";
    description = "일부 표현이 익숙한 논증문 틀처럼 느껴질 수 있습니다. 자신의 경험이나 판단을 한두 문장 더 드러내 보세요.";
  }

  return {
    riskScore,
    riskLevel,
    riskClass,
    description,
    findings,
    questions: [...new Set(questions)],
    sentenceDiagnostics,
    perspectiveCount,
    concreteCount
  };
}

// ---------------------------------------------------------------------------
// 5. 논증 구조 평가
// ---------------------------------------------------------------------------

function analyzeStructure(text) {
  const sentences = getSentences(text);
  const paragraphs = getParagraphs(text);

  const claimSignals = countExpressionList(text, [
    "생각한다", "주장한다", "필요하다", "해야 한다", "바람직하다",
    "동의한다", "반대한다", "라고 본다", "판단한다"
  ]);
  const reasonSignals = countExpressionList(text, [
    "왜냐하면", "그 이유는", "때문에", "때문이다", "근거로", "이유로"
  ]);
  const concreteSignals = countExpressionList(text, concreteExpressions) + (/\d/.test(text) ? 1 : 0);
  const counterSignals = countExpressionList(text, counterExpressions);
  const conclusionSignals = countExpressionList(text, [
    "결론적으로", "따라서", "그러므로", "결국", "요약하면", "이러한 이유로"
  ]);

  let claimScore = 1 + Math.min(3, claimSignals);
  if (sentences.length >= 3) claimScore += 1;

  let evidenceScore = 1 + Math.min(3, reasonSignals);
  if (sentences.length >= 4) evidenceScore += 1;

  let extensionScore = 1 + Math.min(3, concreteSignals);
  if (reasonSignals > 0 && concreteSignals > 0) extensionScore += 1;

  let counterScore = 1 + Math.min(4, counterSignals);

  let conclusionScore = 1 + Math.min(3, conclusionSignals);
  if (paragraphs.length >= 2 && conclusionSignals > 0) conclusionScore += 1;

  return [
    {
      name: "핵심 주장",
      score: clampScore(claimScore),
      praise: "글에서 필자의 핵심 판단이 비교적 분명하게 드러납니다.",
      suggestion: "이 글에서 독자를 가장 설득하고 싶은 내용을 한 문장으로 찾을 수 있을까요?"
    },
    {
      name: "주장을 뒷받침하는 근거",
      score: clampScore(evidenceScore),
      praise: "주장을 뒷받침하는 이유가 글 안에 제시되어 있습니다.",
      suggestion: "각 주장 뒤에 ‘왜 그렇게 생각하는가?’라는 질문의 답이 있는지 확인해 보세요."
    },
    {
      name: "근거의 설명과 사례 확장",
      score: clampScore(extensionScore),
      praise: "근거가 설명이나 사례로 확장되어 독자가 상황을 이해하기 좋습니다.",
      suggestion: "주장을 반복하는 데 그친 문장은 없는지, 실제 사례나 설명을 덧붙일 수 있는지 살펴보세요."
    },
    {
      name: "반론과 다른 관점",
      score: clampScore(counterScore),
      praise: "다른 관점이나 반론을 고려해 논증이 균형 있게 보입니다.",
      suggestion: "이 주장에 동의하지 않는 사람은 어떤 질문을 할지 떠올려 볼 수 있을까요?"
    },
    {
      name: "결론에서 주장 정리",
      score: clampScore(conclusionScore),
      praise: "글의 끝에서 핵심 생각을 다시 정리하고 있습니다.",
      suggestion: "마지막 문단이 앞의 근거를 바탕으로 핵심 주장을 정리하는지 확인해 보세요."
    }
  ].map(addEvaluationMessage);
}

// ---------------------------------------------------------------------------
// 6. 문장·표현 평가
// ---------------------------------------------------------------------------

function hasRepeatedEnding(sentences) {
  if (sentences.length < 3) return false;

  const counts = {};
  sentences.forEach((sentence) => {
    const ending = sentence.replace(/\s+/g, " ").slice(-5);
    counts[ending] = (counts[ending] || 0) + 1;
  });

  return Math.max(...Object.values(counts)) / sentences.length >= 0.6;
}

function analyzeExpression(text) {
  const sentences = getSentences(text);
  const lengths = sentences.map((sentence) => sentence.length);
  const range = lengths.length ? Math.max(...lengths) - Math.min(...lengths) : 0;
  const average = lengths.length ? lengths.reduce((sum, length) => sum + length, 0) / lengths.length : 0;
  const diagnosis = diagnoseAiStyle(text);

  const connectors = ["따라서", "그러므로", "하지만", "또한", "그리고", "결론적으로", "이를 통해", "나아가"];
  const repeatedConnectorCount = connectors.filter((word) => countExpression(text, word) >= 3).length;

  let varietyScore = 2;
  if (sentences.length >= 3) varietyScore += 1;
  if (average >= 15 && average <= 85) varietyScore += 1;
  if (range >= 12) varietyScore += 1;
  if (hasRepeatedEnding(sentences)) varietyScore -= 1;

  const connectorScore = clampScore(5 - repeatedConnectorCount * 2);
  const clicheScore = clampScore(5 - Math.floor(diagnosis.riskScore / 3));
  const endingScore = clampScore(hasRepeatedEnding(sentences) ? 2 : sentences.length >= 3 ? 4 : 3);
  const perspectiveScore = clampScore(1 + Math.min(4, diagnosis.perspectiveCount));

  return [
    {
      name: "문장 길이와 변화",
      score: clampScore(varietyScore),
      praise: "문장 길이에 변화가 있어 글의 리듬이 비교적 자연스럽습니다.",
      suggestion: "문장 길이가 지나치게 비슷하거나 숨이 찰 만큼 긴 부분은 없는지 소리 내어 읽어 보세요."
    },
    {
      name: "접속어 반복",
      score: connectorScore,
      praise: "같은 접속어가 지나치게 반복되지 않습니다.",
      suggestion: "반복되는 접속어 하나를 지워도 문장의 관계가 이어지는지 확인해 보세요."
    },
    {
      name: "상투적·포괄적 표현",
      score: clicheScore,
      praise: "현재 규칙에서는 획일적으로 느껴질 수 있는 표현이 많지 않습니다.",
      suggestion: diagnosis.questions[0] || "일반적인 표현을 실제 상황이나 자신의 판단으로 구체화해 보세요."
    },
    {
      name: "종결 표현 반복",
      score: endingScore,
      praise: "문장 끝맺음이 지나치게 단조롭지 않습니다.",
      suggestion: "‘~할 수 있다’, ‘~해야 한다’, ‘~것이다’가 반복되는지 확인하고 일부 문장에 직접적인 판단을 드러내 보세요."
    },
    {
      name: "필자의 생각과 판단",
      score: perspectiveScore,
      praise: "필자의 생각이나 판단이 글에 드러납니다.",
      suggestion: "설명 뒤에 ‘나는 왜 이 점을 중요하게 보는가?’에 답하는 문장을 덧붙일 수 있을까요?"
    }
  ].map(addEvaluationMessage);
}

function addEvaluationMessage(item) {
  return {
    ...item,
    message: item.score >= 4 ? item.praise : item.suggestion
  };
}

// ---------------------------------------------------------------------------
// 7. 평가 결과를 화면에 표시하는 함수
// ---------------------------------------------------------------------------

function createEvaluationCard(item) {
  const card = document.createElement("article");
  card.className = "evaluation-card";
  if (item.score >= 4) card.classList.add("score-high");
  if (item.score <= 2) card.classList.add("score-low");

  const heading = document.createElement("div");
  heading.className = "evaluation-heading";
  const title = document.createElement("h3");
  title.textContent = item.name;
  const score = document.createElement("span");
  score.className = "score-label";
  score.textContent = `${item.score} / 5점`;
  heading.append(title, score);

  const track = document.createElement("div");
  track.className = "score-track";
  const fill = document.createElement("div");
  fill.className = "score-fill";
  fill.style.width = `${item.score * 20}%`;
  track.appendChild(fill);

  const message = document.createElement("p");
  message.textContent = item.message;
  card.append(heading, track, message);
  return card;
}

function renderCards(container, items) {
  container.replaceChildren();
  items.forEach((item) => container.appendChild(createEvaluationCard(item)));
}

function renderMessageList(container, items) {
  container.replaceChildren();
  items.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.textContent = item.text;
    listItem.className = item.type || "";
    container.appendChild(listItem);
  });
}

function getAverage(items) {
  return items.reduce((sum, item) => sum + item.score, 0) / items.length;
}

function renderStructureEvaluation() {
  const items = analyzeStructure(writingData.originalEssay);
  const average = getAverage(items);
  document.querySelector("#structureAverage").textContent = `${average.toFixed(1)} / 5점`;
  document.querySelector("#structureSummary").textContent =
    average >= 4
      ? "논증의 주요 요소가 비교적 고르게 드러납니다. 낮은 항목 하나를 골라 더 선명하게 다듬어 보세요."
      : average >= 3
        ? "논증의 기본 틀이 보입니다. 점수가 낮은 항목부터 한 가지씩 살펴보세요."
        : "아직 발전시킬 여지가 많은 초안입니다. 낮은 점수는 다음에 무엇을 확인하면 좋을지 알려 주는 신호입니다.";
  renderCards(document.querySelector("#structureCards"), items);
}

function renderExpressionEvaluation() {
  const text = writingData.originalEssay;
  const items = analyzeExpression(text);
  const diagnosis = diagnoseAiStyle(text);

  document.querySelector("#statCharacters").textContent = text.length;
  document.querySelector("#statSentences").textContent = getSentences(text).length;
  document.querySelector("#statParagraphs").textContent = getParagraphs(text).length;
  renderCards(document.querySelector("#expressionCards"), items);

  document.querySelector("#aiRiskLabel").textContent = diagnosis.riskLevel;
  document.querySelector("#aiRiskBadge").className = `risk-badge ${diagnosis.riskClass}`;
  document.querySelector("#aiRiskDescription").textContent = diagnosis.description;

  const findingItems = diagnosis.findings.length
    ? diagnosis.findings.map((item) => ({
        type: "warning",
        text: `“${item.expression}” ${item.count}회 · ${item.category}\n${item.explanation}`
      }))
    : [{ type: "positive", text: "현재 규칙에서 발견된 상투적·기계적 표현이 없습니다." }];

  const sentenceItems = diagnosis.sentenceDiagnostics.length
    ? diagnosis.sentenceDiagnostics.map((item) => ({
        type: "warning",
        text: `“${item.sentence}”\n${item.explanation}`
      }))
    : [{ type: "positive", text: "특정 표현 때문에 따로 살펴볼 문장은 발견되지 않았습니다." }];

  const directionItems = diagnosis.questions.length
    ? diagnosis.questions.map((text) => ({ text }))
    : [{ type: "positive", text: "마지막으로 글을 소리 내어 읽고 자신의 말투처럼 들리는지 확인해 보세요." }];

  renderMessageList(document.querySelector("#aiFindingsList"), findingItems);
  renderMessageList(document.querySelector("#aiSentenceList"), sentenceItems);
  renderMessageList(document.querySelector("#aiDirectionList"), directionItems);
}

// ---------------------------------------------------------------------------
// 8. 종합 피드백
// ---------------------------------------------------------------------------

function buildOverallFeedback(text) {
  const structure = analyzeStructure(text);
  const expression = analyzeExpression(text);
  const allItems = [...structure, ...expression];
  const diagnosis = diagnoseAiStyle(text);

  const good = allItems
    .filter((item) => item.score >= 4)
    .map((item) => ({ type: "positive", text: `${item.name}: ${item.praise}` }));

  const improve = allItems
    .filter((item) => item.score <= 3)
    .map((item) => ({ type: "warning", text: `${item.name}: ${item.suggestion}` }));

  const directions = allItems
    .filter((item) => item.score <= 3)
    .map((item) => ({ text: item.suggestion }));

  diagnosis.questions.forEach((question) => {
    if (!directions.some((item) => item.text === question)) directions.push({ text: question });
  });

  if (!good.length) {
    good.push({ type: "positive", text: "논증문 전체를 작성하고 점검을 시작한 과정 자체가 좋은 출발입니다." });
  }

  if (!improve.length) {
    improve.push({ text: "큰 보완 신호는 발견되지 않았습니다. 가장 중요하게 느끼는 문장 한 곳을 더 선명하게 다듬어 보세요." });
  }

  if (!directions.length) {
    directions.push({ text: "글을 소리 내어 읽고 자신의 생각이 가장 잘 드러나는 문장과 덜 드러나는 문장을 찾아보세요." });
  }

  return {
    good,
    improve,
    directions,
    summary:
      "아래 결과는 글을 대신 고쳐 주는 답안이 아닙니다. 좋은 점은 유지하고, 보완할 점 중 가장 중요하다고 느끼는 질문 하나부터 고쳐쓰기에 반영해 보세요."
  };
}

function renderOverallFeedback() {
  const result = buildOverallFeedback(writingData.originalEssay);
  document.querySelector("#overallSummary").textContent = result.summary;
  renderMessageList(document.querySelector("#goodPointsList"), result.good);
  renderMessageList(document.querySelector("#improvementPointsList"), result.improve);
  renderMessageList(document.querySelector("#revisionDirectionsList"), result.directions);
}

document.querySelector("#goToRevisionButton").addEventListener("click", () => moveToStep(4));

// ---------------------------------------------------------------------------
// 9. 고쳐쓰기와 수정 전후 비교
// ---------------------------------------------------------------------------

function renderRevisionScreen() {
  document.querySelector("#revisionOriginalView").textContent =
    writingData.originalEssay.trim() || "아직 작성한 원문이 없습니다.";
  revisionEssayInput.value = writingData.revisionEssay;
  updateCharacterCounts();
}

function getComparisonStatistics(text) {
  const diagnosis = diagnoseAiStyle(text);
  const clicheCount = diagnosis.findings
    .filter((item) => item.category === "상투적 도입 표현" || item.category === "지나치게 포괄적인 표현")
    .reduce((sum, item) => sum + item.count, 0);

  return {
    characters: text.length,
    sentences: getSentences(text).length,
    paragraphs: getParagraphs(text).length,
    cliches: clicheCount,
    concrete: diagnosis.concreteCount,
    counter: countExpressionList(text, counterExpressions),
    perspective: diagnosis.perspectiveCount,
    aiRisk: diagnosis.riskScore
  };
}

function createComparisonRow(label, original, revision, preferredDirection = "neutral") {
  const row = document.createElement("tr");
  const labelCell = document.createElement("th");
  const originalCell = document.createElement("td");
  const revisionCell = document.createElement("td");
  const changeCell = document.createElement("td");
  const difference = revision - original;

  labelCell.textContent = label;
  originalCell.textContent = original;
  revisionCell.textContent = revision;
  changeCell.textContent = difference > 0 ? `+${difference}` : difference < 0 ? `${difference}` : "변화 없음";
  changeCell.className = "change-neutral";

  if (
    (preferredDirection === "up" && difference > 0) ||
    (preferredDirection === "down" && difference < 0)
  ) {
    changeCell.className = "change-positive";
  } else if (
    (preferredDirection === "up" && difference < 0) ||
    (preferredDirection === "down" && difference > 0)
  ) {
    changeCell.className = "change-warning";
  }

  row.append(labelCell, originalCell, revisionCell, changeCell);
  return row;
}

function buildComparisonFeedback(original, revision) {
  const improved = [];
  const next = [];

  if (revision.concrete > original.concrete) {
    improved.push({ type: "positive", text: "수정본에서 구체적인 사례 표현이 늘어 근거를 이해하기 쉬워졌습니다." });
  } else if (revision.concrete === 0) {
    next.push({ type: "warning", text: "수정본에도 구체적인 사례가 적습니다. 실제 경험이나 상황을 한 가지 추가해 보세요." });
  }

  if (revision.cliches < original.cliches) {
    improved.push({ type: "positive", text: "수정본에서 상투적이고 포괄적인 표현이 줄었습니다." });
  } else if (revision.cliches > 0) {
    next.push({ type: "warning", text: "수정본에도 상투적인 표현이 남아 있습니다. 자신의 상황이나 판단으로 바꿀 수 있는지 살펴보세요." });
  }

  if (revision.counter > original.counter) {
    improved.push({ type: "positive", text: "다른 관점이나 반론을 고려하는 표현이 늘었습니다." });
  } else if (revision.counter === 0) {
    next.push({ type: "warning", text: "다른 관점의 질문과 그에 대한 답을 글에 드러낼 수 있을까요?" });
  }

  if (revision.perspective > original.perspective) {
    improved.push({ type: "positive", text: "수정본에서 필자의 생각과 판단이 더 분명하게 드러납니다." });
  } else if (revision.perspective === 0) {
    next.push({ type: "warning", text: "필자의 생각이나 판단을 보여 주는 문장을 한 문장 덧붙여 보세요." });
  }

  if (revision.aiRisk < original.aiRisk) {
    improved.push({ type: "positive", text: "AI 글과 유사하게 보일 수 있는 표현과 특징이 줄었습니다." });
  }

  if (!improved.length) {
    improved.push({ text: "수정본을 직접 다시 작성한 과정 자체가 중요한 변화입니다. 달라진 문장을 찾아 그 이유를 설명해 보세요." });
  }

  if (!next.length) {
    next.push({ text: "큰 보완 신호는 발견되지 않았습니다. 마지막으로 소리 내어 읽으며 자신의 말투처럼 들리는지 확인해 보세요." });
  }

  return { improved, next };
}

function renderComparisonScreen() {
  const hasRevision = Boolean(writingData.revisionEssay.trim());
  document.querySelector("#emptyRevisionNotice").hidden = hasRevision;
  document.querySelector("#comparisonOriginalView").textContent =
    writingData.originalEssay.trim() || "아직 작성한 원문이 없습니다.";
  document.querySelector("#comparisonRevisionView").textContent =
    writingData.revisionEssay.trim() || "먼저 5단계에서 수정본을 작성해 주세요.";

  const original = getComparisonStatistics(writingData.originalEssay);
  const revision = getComparisonStatistics(writingData.revisionEssay);
  const rows = [
    ["글자 수", original.characters, revision.characters, "neutral"],
    ["문장 수", original.sentences, revision.sentences, "neutral"],
    ["문단 수", original.paragraphs, revision.paragraphs, "up"],
    ["상투적 표현 개수", original.cliches, revision.cliches, "down"],
    ["구체적 사례 표현 개수", original.concrete, revision.concrete, "up"],
    ["반론 표현 개수", original.counter, revision.counter, "up"],
    ["필자 관점 표현 개수", original.perspective, revision.perspective, "up"]
  ];

  const tableBody = document.querySelector("#comparisonTableBody");
  tableBody.replaceChildren();
  rows.forEach((row) => tableBody.appendChild(createComparisonRow(...row)));

  if (!hasRevision) {
    const guide = [{ type: "warning", text: "먼저 5단계에서 수정본을 작성해 주세요." }];
    renderMessageList(document.querySelector("#comparisonImprovedList"), guide);
    renderMessageList(document.querySelector("#comparisonNextList"), guide);
    return;
  }

  const feedback = buildComparisonFeedback(original, revision);
  renderMessageList(document.querySelector("#comparisonImprovedList"), feedback.improved);
  renderMessageList(document.querySelector("#comparisonNextList"), feedback.next);
}

document.querySelector("#returnToRevisionButton").addEventListener("click", () => moveToStep(4));

// ---------------------------------------------------------------------------
// 10. 앱 시작
// ---------------------------------------------------------------------------

loadWritingData();
topicInput.value = writingData.topic;
originalEssayInput.value = writingData.originalEssay;
revisionEssayInput.value = writingData.revisionEssay;
updateCharacterCounts();
showStep(0);
