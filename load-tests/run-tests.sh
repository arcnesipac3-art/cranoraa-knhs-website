#!/bin/bash
# Shell script to run k6 load tests on Linux/macOS
# Usage: ./run-tests.sh [scenario]
# Example: ./run-tests.sh smoke
#          ./run-tests.sh load
#          ./run-tests.sh all

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCENARIO=${1:-load}
BASE_URL=${BASE_URL:-http://localhost:8000}
FRONTEND_URL=${FRONTEND_URL:-http://localhost:5173}

# Functions
print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_info() {
    echo -e "${CYAN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

print_error() {
    echo -e "${RED}$1${NC}"
}

check_k6_installed() {
    if ! command -v k6 &> /dev/null; then
        print_error "✗ k6 is not installed"
        echo ""
        print_info "Install k6 using one of these methods:"
        echo "  macOS: brew install k6"
        echo "  Linux: See https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
    print_success "✓ k6 is installed"
}

check_backend_running() {
    if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health/" | grep -q "200"; then
        print_success "✓ Backend is running"
        return 0
    else
        print_warning "✗ Backend is not responding at $BASE_URL"
        echo ""
        print_info "Make sure your Django backend is running:"
        echo "  cd backend"
        echo "  python manage.py runserver"
        echo ""
        read -p "Do you want to continue anyway? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

run_k6_test() {
    local test_name=$1
    local script_file=$2
    local scenario_type=$3
    
    print_info "\n$(printf '=%.0s' {1..80})"
    print_info "Running: $test_name"
    print_info "$(printf '=%.0s' {1..80})\n"
    
    export BASE_URL
    export FRONTEND_URL
    
    if [ -n "$scenario_type" ]; then
        k6 run --env SCENARIO="$scenario_type" "$script_file"
    else
        k6 run "$script_file"
    fi
    
    if [ $? -eq 0 ]; then
        print_success "\n✓ $test_name completed successfully"
        return 0
    else
        print_error "\n✗ $test_name failed"
        return 1
    fi
}

# Main script
echo ""
print_info "$(printf '=%.0s' {1..80})"
print_info " KNHS School Portal - Load Testing Suite"
print_info "$(printf '=%.0s' {1..80})"
echo ""

# Check prerequisites
print_info "Checking prerequisites..."
check_k6_installed
print_info "Checking if backend is running at $BASE_URL..."
check_backend_running

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

print_info "\nTest Configuration:"
echo "  Base URL: $BASE_URL"
echo "  Frontend URL: $FRONTEND_URL"
echo "  Scenario: $SCENARIO"
echo ""

# Run tests
success_count=0
total_count=0

case $SCENARIO in
    smoke)
        run_k6_test "Smoke Test" "k6-load-test.js" "smoke"
        success_count=$?
        total_count=1
        ;;
    load)
        run_k6_test "Load Test" "k6-load-test.js" "load"
        success_count=$?
        total_count=1
        ;;
    stress)
        run_k6_test "Stress Test" "k6-load-test.js" "stress"
        success_count=$?
        total_count=1
        ;;
    spike)
        run_k6_test "Spike Test" "k6-load-test.js" "spike"
        success_count=$?
        total_count=1
        ;;
    soak)
        run_k6_test "Soak Test" "k6-load-test.js" "soak"
        success_count=$?
        total_count=1
        ;;
    endpoints)
        run_k6_test "API Endpoints Test" "k6-api-endpoints-test.js" ""
        success_count=$?
        total_count=1
        ;;
    all)
        print_info "Running all test scenarios (this will take a while)...\n"
        
        run_k6_test "Smoke Test" "k6-load-test.js" "smoke" && ((success_count++))
        total_count=$((total_count + 1))
        sleep 5
        
        run_k6_test "API Endpoints Test" "k6-api-endpoints-test.js" "" && ((success_count++))
        total_count=$((total_count + 1))
        sleep 5
        
        run_k6_test "Load Test" "k6-load-test.js" "load" && ((success_count++))
        total_count=$((total_count + 1))
        sleep 5
        
        run_k6_test "Spike Test" "k6-load-test.js" "spike" && ((success_count++))
        total_count=$((total_count + 1))
        ;;
    *)
        print_error "Unknown scenario: $SCENARIO"
        echo ""
        echo "Valid scenarios: smoke, load, stress, spike, soak, endpoints, all"
        exit 1
        ;;
esac

# Summary
echo ""
print_info "$(printf '=%.0s' {1..80})"
print_info "Test Summary"
print_info "$(printf '=%.0s' {1..80})"
echo ""
echo "Completed: $success_count / $total_count tests passed"

if [ $success_count -eq $total_count ]; then
    print_success "\n✓ All tests passed!"
else
    print_warning "\n⚠ Some tests failed. Check the output above for details."
fi

# Check if HTML report was generated
REPORT_FILE="$SCRIPT_DIR/load-test-summary.html"
if [ -f "$REPORT_FILE" ]; then
    print_info "\nHTML Report generated: $REPORT_FILE"
    
    # Try to open in browser (works on macOS and some Linux)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        read -p "Open HTML report in browser? (Y/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            open "$REPORT_FILE"
        fi
    elif command -v xdg-open &> /dev/null; then
        read -p "Open HTML report in browser? (Y/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            xdg-open "$REPORT_FILE"
        fi
    fi
fi

echo ""
