const permissionMiddleware = (moduleName) => {
  return (req, res, next) => {
    // Admins and Trustees always have full management access
    if (req.user.role === 'Admin' || req.user.role === 'Trustee') {
      return next();
    }
    
    // BranchManagers and other roles pass through, relying on controller-level creator/branch checks
    return next();
  };
};

module.exports = permissionMiddleware;
