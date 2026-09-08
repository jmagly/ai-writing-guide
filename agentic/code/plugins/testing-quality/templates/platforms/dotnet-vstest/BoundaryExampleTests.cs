// TODO: use the installed project's test framework; this example assumes MSTest and VSTest.
using Microsoft.VisualStudio.TestTools.UnitTesting;
[TestClass]
public class BoundaryExampleTests {
    private static bool Positive(int value) => value > 0;
    [TestMethod]
    public void PositiveBoundary() { Assert.IsTrue(Positive(1)); Assert.IsFalse(Positive(0)); }
}
