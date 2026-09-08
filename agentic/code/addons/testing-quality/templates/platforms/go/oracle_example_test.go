// TODO: replace the example function with the public SUT and review package scope.
package example
import "testing"
func positive(n int) bool { return n > 0 }
func TestPositive(t *testing.T) { if !positive(1) || positive(0) { t.Fatal("positive boundary is incorrect") } }
