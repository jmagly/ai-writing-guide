// TODO: replace illustrative SUT, qualify installed JUnit engine and aggregate module XML reports.
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class BoundaryExampleTest {
    boolean positive(int value) { return value > 0; }
    @Test void positiveBoundary() { assertTrue(positive(1)); assertFalse(positive(0)); }
}
