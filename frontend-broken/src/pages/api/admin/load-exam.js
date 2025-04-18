"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
var db_1 = require("@config/db");
var conn = await db_1.default.getConnection(); // 只要用一次就好
function handler(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var exam_id, questions, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    exam_id = req.query.exam_id;
                    if (!exam_id || typeof exam_id !== "string") {
                        return [2 /*return*/, res.status(400).json({ error: "❌ 缺少 exam_id 参数" })];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, db_1.default.query("\n      WITH RECURSIVE qtree AS (\n        SELECT\n          qb.id,\n          qb.text,\n          qb.level,\n          qb.parent_id,\n          eq.exam_id,\n          eq.sort_order,\n          qb.marks,\n          qr.report_text AS report,\n          qr.exemplar_text AS exemplar,\n          NULL AS parent_text,\n          qb.text AS full_path\n        FROM question_bank qb\n        JOIN exam_questions eq ON qb.id = eq.question_bank_id\n        LEFT JOIN question_report qr ON qr.question_bank_id = qb.id AND qr.exam_id = eq.exam_id\n        WHERE eq.exam_id = ? AND qb.parent_id IS NULL\n\n        UNION ALL\n\n        SELECT\n          qb.id,\n          qb.text,\n          qb.level,\n          qb.parent_id,\n          qtree.exam_id,\n          qtree.sort_order,\n          qb.marks,\n          qr.report_text AS report,\n          qr.exemplar_text AS exemplar,\n          qtree.text AS parent_text,\n          CONCAT(qtree.full_path, ' \u2192 ', qb.text)\n        FROM question_bank qb\n        JOIN qtree ON qb.parent_id = qtree.id\n        LEFT JOIN question_report qr ON qr.question_bank_id = qb.id AND qr.exam_id = qtree.exam_id\n      )\n      SELECT * FROM qtree ORDER BY sort_order, full_path\n      ", [exam_id])];
                case 2:
                    questions = (_a.sent())[0];
                    return [2 /*return*/, res.status(200).json({ exam_id: exam_id, questions: questions })];
                case 3:
                    e_1 = _a.sent();
                    return [2 /*return*/, res.status(500).json({ error: "❌ 数据库查询失败", detail: e_1.message })];
                case 4: return [2 /*return*/];
            }
        });
    });
}
