using backend.intex.DTOs.Safehouses;
using backend.intex.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.intex.Controllers;

[AllowAnonymous]
[Route("public/safehouses")]
public sealed class PublicSafehousesController(ISafehouseService safehouseService) : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<PublicSafehouseListResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PublicSafehouseListResponse>> ListPublicSafehouses(CancellationToken cancellationToken)
        => Ok(await safehouseService.ListPublicSafehousesAsync(cancellationToken));
}
