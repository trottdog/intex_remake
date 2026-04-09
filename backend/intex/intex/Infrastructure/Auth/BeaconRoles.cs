namespace backend.intex.Infrastructure.Auth;

public static class BeaconRoles
{
    public const string Public = "public";
    public const string Donor = "donor";
    public const string Staff = "staff";
    public const string Admin = "admin";
    public const string SuperAdmin = "super_admin";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Public,
        Donor,
        Staff,
        Admin,
        SuperAdmin
    };
}
