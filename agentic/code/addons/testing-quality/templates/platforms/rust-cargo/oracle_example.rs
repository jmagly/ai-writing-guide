// TODO: import the real SUT; qualify a case-results adapter separately from Cargo build JSON.
fn positive(n: i32) -> bool { n > 0 }
#[cfg(test)]
mod tests {
    use super::positive;
    #[test]
    fn positive_boundary() { assert!(positive(1)); assert!(!positive(0)); }
}
