INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 1, 1);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 2, 2);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 3, 3);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 4, 4);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 5, 5);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 6, 6);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 7, 7);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 8, 8);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 9, 9);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 10, 10);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 11, 1);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 12, 2);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 13, 3);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 14, 4);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 15, 5);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 16, 6);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 17, 7);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 18, 8);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 19, 9);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 20, 1);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 21, 1);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 22, 2);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 23, 3);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 24, 1);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 25, 2);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 26, 3);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 27, 4);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 28, 5);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 29, 6);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 30, 7);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 31, 8);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 32, 9);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 33, 1);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 34, 2);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 35, 3);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 36, 4);
INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES (23, 37, 5);
INSERT INTO question_codeblock (question_bank_id, code) VALUES (3, '01 procedure bubbleSort(numbers : byRef)
02 flag = true
03 for x = 0 to numbers.length – 1
04 if numbers[x] > numbers[x + 1] then
05 holdValue = numbers[x]
06 numbers[x] = numbers[x + 1]
07 numbers[x + 1] = holdValue
08 flag = false
09 endif
10 next x
11 endprocedure');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (4, '(i) Explain why the procedure bubbleSort accepts the array numbers by reference and not by value. ......................................................................................................................................');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (5, '(ii) The programmer has used a for loop on line 3 in the procedure bubbleSort. A for loop is a count controlled loop. State what is meant by the term ‘count controlled loop’. ......................................................................................................................................');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (6, '(iii) State the purpose of the variable holdValue in the procedure bubbleSort. ......................................................................................................................................');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (7, '(iv) The procedure bubbleSort will only partially sort the array numbers into order. Describe what the programmer would need to add to the algorithm to enable it to fully sort the numbers into order. ......................................................................................................................................');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (11, 'Taylor is designing a program for a client who would like to simulate earthquakes on major cities around the world in 3D. The client would like to be able to view any stage of an earthquake such as: 1. the build-up of the earthquake 2. the earthquake taking place 3. the aftershocks of the earthquake. The client would also like to be able to play the simulation at different speeds. For example, a slow, normal or fast speed.');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (14, '(i) Identify two different inputs for this program. 1 ........................................................................................................................................ 2 ........................................................................................................................................');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (15, '(ii) One decision point in the program will be to decide if the user inputs are suitable or not. Identify two other example decision points in this program. 1 ........................................................................................................................................ 2 ........................................................................................................................................');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (18, '(ii) Give two reasons why the waterfall model is not suitable for Taylor. 1 ......................................................................................................................................... 2 .........................................................................................................................................');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (21, '25 / 2 = 12 remainder 1
12 / 2 = 6 remainder 0');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (23, 'The main program: • asks the user to enter a denary number between 1 and 255 • checks that the input is valid between 1 and 255 • If valid call the function toBinary() and pass the input as a parameter • outputs the return value • If not valid, repeatedly asks the user to input a number until the number is valid. Write the algorithm for the main program. You should write your algorithm using pseudocode or program code. .............................................................................................................................................. [4]');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (24, '01 total = 1
02 smallest = 9999
03 largest = -1
04 for x = 0 to 21
05 dataArray[x] = input("Enter a number")
06 total = total + dataArray[x]
07 if dataArray[x] < largest then
08 largest = dataArray[x]
09 endif
10 if dataArray[x] < smallest then
11 smallest = dataArray[x]
12 endif
13 next x
14 print("Average = " + total * 20)
15 print("Smallest = " + smallest)
16 print("Largest = " + largest)');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (34, 'The program needs to search the array for a number that is input by the user.');
INSERT INTO question_codeblock (question_bank_id, code) VALUES (35, '(i) Describe how a linear search will search the data in the array for a number that has been input. ......................................................................................................................................');