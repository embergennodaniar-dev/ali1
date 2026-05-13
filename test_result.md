#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Mood-to-Menu AI restaurant app. Latest request: After AI finalizes the menu/order,
  let user tap a "Confirm Order" button which generates a payment-link QR code that
  the user shows at the restaurant cashier. QR contains a payment URL that includes
  the order ID and total amount.

backend:
  - task: "POST /api/orders – create order and generate payment link"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added CreateOrderRequest model + /api/orders POST and /api/orders/{order_id} GET. Generates ORD<8hex> id, payment_url=https://pay.mood-to-menu.uz/o/{id}?amount={total}, persists to db.orders. Needs verification."
      - working: true
        agent: "testing"
        comment: "All 3 POST scenarios verified via /app/backend_test.py against external URL. (1) Happy path {summary:'Palaw + Ayran', total:75000, language:'kk'} → 200 with order_id matching ORD+8 uppercase hex (e.g. ORDD9D5D9B8), payment_url contains order_id and 'amount=75000', total=75000, status='pending'. (2) Empty body {} → 200 with valid order_id, total=0, payment_url present. (3) Body with session_id='abc-123', total=50000, language='ru' → 200; persisted order confirmed via GET returns session_id='abc-123', language='ru', total=50000. Orders correctly written to db.orders."

  - task: "GET /api/orders/{order_id} – fetch order"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Returns 404 when not found, full order otherwise (no _id leak)."
      - working: true
        agent: "testing"
        comment: "Verified. GET /api/orders/{valid_id} returns 200 with order_id, summary, total=75000, language='kk', payment_url, status='pending' and NO MongoDB _id field (uses projection {_id:0}). GET /api/orders/INVALID_ID returns 404 with detail='Order not found' exactly as expected."

  - task: "Regression: GET /api/menu"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "low"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Sanity check OK – /api/menu returns 200 with 99 items (>=90 expected)."

  - task: "Regression: POST /api/chat/sessions"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "low"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Sanity check OK – POST /api/chat/sessions {language:'kk'} returns 200 with session_id (uuid) and Karakalpak greeting starting with 'Sálem! 🍽️ Men Mood-to-Menu aqıllı agentimen.'."

frontend:
  - task: "Confirm Order button + QR modal on result screen"
    implemented: true
    working: "NA"
    file: "frontend/app/(tabs)/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Replaced Like button with primary green Confirm Order CTA that calls /api/orders, shows full-screen QR modal with QRCode (react-native-qrcode-svg), order id, total, and Done button that resets flow."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Added order/QR backend endpoints. Please test:
      1) POST /api/orders with body {summary:"test", total:75000, language:"kk"} → expect 200 with order_id starting "ORD", payment_url containing the order_id and amount=75000.
      2) POST /api/orders with total=0 should still succeed (free order).
      3) GET /api/orders/{order_id} with the id from step 1 → returns the order.
      4) GET /api/INVALID → 404.
      Frontend integration not in scope for backend test.
  - agent: "testing"
    message: |
      Backend testing complete. All 7 tests passed (see /app/backend_test.py):
      ✅ POST /api/orders happy path – order_id matches ORD+8 uppercase hex, payment_url contains order_id and amount=75000, status=pending, total=75000.
      ✅ POST /api/orders with empty body {} – defaults apply, total=0, valid order_id + payment_url.
      ✅ POST /api/orders with session_id='abc-123', language='ru', total=50000 – persisted; confirmed via GET.
      ✅ GET /api/orders/{id} – returns full order doc, no _id leak.
      ✅ GET /api/orders/INVALID_ID – 404 with detail 'Order not found'.
      ✅ Regression GET /api/menu – 99 items (>=90 required).
      ✅ Regression POST /api/chat/sessions {language:'kk'} – 200 with session_id + Karakalpak greeting.
      No issues found. Main agent can summarise and finish.